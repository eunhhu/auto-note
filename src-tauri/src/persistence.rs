use std::{
    fs,
    path::{Path, PathBuf},
};

use crate::{
    error::AppError,
    model::{SESSION_SCHEMA_VERSION, Session},
};

const ENV_DATA_DIR: &str = "AUTO_NOTE_DATA_DIR";

#[derive(Debug, Clone)]
pub struct Persistence {
    data_dir: PathBuf,
}

impl Persistence {
    pub fn new() -> Result<Self, AppError> {
        let data_dir = if let Some(overridden) = std::env::var_os(ENV_DATA_DIR) {
            PathBuf::from(overridden)
        } else {
            dirs::data_dir()
                .ok_or_else(|| AppError::Io("cannot resolve OS data directory".to_string()))?
                .join("auto-note")
        };
        Self::with_data_dir(data_dir)
    }

    pub fn with_data_dir(data_dir: PathBuf) -> Result<Self, AppError> {
        fs::create_dir_all(data_dir.join("sessions"))?;
        fs::create_dir_all(data_dir.join("quarantine"))?;
        Ok(Self { data_dir })
    }

    pub fn list_sessions(&self) -> Result<Vec<String>, AppError> {
        let mut ids = vec![];
        for entry in fs::read_dir(self.sessions_dir())? {
            let entry = entry?;
            let path = entry.path();
            if path.extension().and_then(|ext| ext.to_str()) == Some("json")
                && let Some(stem) = path.file_stem().and_then(|v| v.to_str())
            {
                ids.push(stem.to_string());
            }
        }
        ids.sort();
        Ok(ids)
    }

    pub fn save_session(&self, session: &Session) -> Result<(), AppError> {
        session.validate()?;
        let path = self.session_path(&session.id);
        let payload = serde_json::to_string_pretty(session)?;
        fs::write(path, payload)?;
        Ok(())
    }

    pub fn load_session(&self, id: &str) -> Result<Session, AppError> {
        let path = self.session_path(id);
        let bytes = fs::read_to_string(&path).map_err(|error| {
            if error.kind() == std::io::ErrorKind::NotFound {
                AppError::NotFound(format!("session {id}"))
            } else {
                AppError::Io(error.to_string())
            }
        })?;

        match serde_json::from_str::<Session>(&bytes) {
            Ok(session) => {
                session.validate()?;
                Ok(session)
            }
            Err(error) => {
                self.quarantine_corrupt_json(id, &bytes)?;
                Err(AppError::Validation(format!(
                    "session {id} is corrupt: {error}"
                )))
            }
        }
    }

    pub fn import_session_json(&self, payload: &str) -> Result<Session, AppError> {
        let session: Session = serde_json::from_str(payload)?;
        if session.schema_version != SESSION_SCHEMA_VERSION {
            return Err(AppError::Validation(format!(
                "schema version {} is not supported",
                session.schema_version
            )));
        }
        session.validate()?;
        self.save_session(&session)?;
        Ok(session)
    }

    pub fn export_session_json(&self, id: &str) -> Result<String, AppError> {
        let session = self.load_session(id)?;
        let payload = serde_json::to_string_pretty(&session)?;
        Ok(payload)
    }

    pub fn delete_session(&self, id: &str) -> Result<(), AppError> {
        let path = self.session_path(id);
        fs::remove_file(path).map_err(|error| {
            if error.kind() == std::io::ErrorKind::NotFound {
                AppError::NotFound(format!("session {id}"))
            } else {
                AppError::Io(error.to_string())
            }
        })?;
        Ok(())
    }

    fn sessions_dir(&self) -> PathBuf {
        self.data_dir.join("sessions")
    }

    fn quarantine_dir(&self) -> PathBuf {
        self.data_dir.join("quarantine")
    }

    fn session_path(&self, id: &str) -> PathBuf {
        self.sessions_dir().join(format!("{id}.json"))
    }

    fn quarantine_corrupt_json(&self, id: &str, bytes: &str) -> Result<(), AppError> {
        let path = self.quarantine_dir().join(format!("{id}.corrupt.json"));
        fs::write(path, bytes)?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn data_dir(&self) -> &Path {
        &self.data_dir
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::TempDir;

    use crate::{error::AppError, model::Session};

    use super::Persistence;

    #[test]
    fn saves_and_loads_session() {
        let dir = TempDir::new().expect("tempdir");
        let persistence =
            Persistence::with_data_dir(dir.path().to_path_buf()).expect("new persistence");
        let session = Session::new("one".to_string(), 180.0, 5, vec![]);
        persistence.save_session(&session).expect("save");
        let loaded = persistence.load_session(&session.id).expect("load");
        assert_eq!(loaded.id, session.id);
    }

    #[test]
    fn quarantines_corrupt_json() {
        let dir = TempDir::new().expect("tempdir");
        let persistence =
            Persistence::with_data_dir(dir.path().to_path_buf()).expect("new persistence");
        let session_path = dir.path().join("sessions/bad.json");
        fs::write(&session_path, "not json").expect("write");
        let result = persistence.load_session("bad");
        assert!(result.is_err());
        assert!(dir.path().join("quarantine/bad.corrupt.json").exists());
    }

    #[test]
    fn deletes_existing_session_file() {
        let dir = TempDir::new().expect("tempdir");
        let persistence =
            Persistence::with_data_dir(dir.path().to_path_buf()).expect("new persistence");
        let session = Session::new("one".to_string(), 180.0, 0, vec![]);
        persistence.save_session(&session).expect("save");
        persistence.delete_session(&session.id).expect("delete");
        let load = persistence.load_session(&session.id);
        assert!(load.is_err());
    }

    #[test]
    fn delete_missing_session_returns_not_found() {
        let dir = TempDir::new().expect("tempdir");
        let persistence =
            Persistence::with_data_dir(dir.path().to_path_buf()).expect("new persistence");
        let result = persistence.delete_session("missing-id");
        assert!(matches!(result, Err(AppError::NotFound(_))));
    }
}
