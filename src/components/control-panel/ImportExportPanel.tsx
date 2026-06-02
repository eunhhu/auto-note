type Props = {
  readonly canPlay: boolean
  readonly exportText: string
  readonly importText: string
  readonly onExportJson: () => void
  readonly onImportJson: () => void
  readonly onSetImportText: (value: string) => void
}

export function ImportExportPanel(props: Props) {
  return (
    <div className="section">
      <h2>Import / Export</h2>
      <textarea
        rows={4}
        value={props.importText}
        onChange={(event) => props.onSetImportText(event.target.value)}
      />
      <button type="button" onClick={props.onImportJson}>
        Import JSON
      </button>
      <button type="button" disabled={!props.canPlay} onClick={props.onExportJson}>
        Export Selected
      </button>
      <textarea readOnly rows={4} value={props.exportText} />
    </div>
  )
}
