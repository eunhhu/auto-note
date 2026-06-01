# Auto Note - Rhythm game Macro

Tauri + rdev + enigo + bun

### MVP

본인이 플레이한 키 타이밍을 그대로 replay할 수 있는 매크로.

기본적으로 레코드 세션이 있으며, 해당 세션은 json으로 save/load가능.
세션을 F10(혹은 사용자 지정 키)로 record하면 그때부터 키 녹화가 시작됨.

사용자는 그때부터 global key listen으로 키보드 press/release timing을 기록함.
기록이 완료되고 F10(혹은 사용자 지정 키)로 record를 완료하면 세션이 저장됨.

localstorage를 이용하여 persistance저장을 할 수 있고 json으로 내보내기/불러오기 가능.

저장된 세션은 play를 누르면 enigo로 1ms의 오차도 없이 그대로 재생이 되어야함.
TAS처럼 visual edit을 누르면 리듬게임 노트처럼 press/release timing map이 나오고 해당 키 타이밍을 수정 가능함.

노트 시각화는 bpm 기반 grid로 표기 가능. bpm과 offset은 사용자가 지정가능함.

노트 시각화는 테이블처럼 - 근데 테이블은 아니고 캔버스여야함. 그래프같은
예시:
| S | D | J | K |
key를 행에두고,
타이밍 맵을 열에 둠.

press/release 지점을 따로 두는 것이 아닌 클릭한 상태이면 채우기, 아니면 없어지는 식으로 시각화하면 됨.
키 노트는 선택/여러개 선택/삭제/단체 이동/복사/붙여넣기/잘라내기 등의 액션이 가능해야함.

windows, macos, linux 크로스 플랫폼 지원.

녹화 및 리플레이는 내부적으로 1ms의 오차도 없도록 보정/보간 필요.
중간에서부터 녹화 시작

### PMF

세션을 여러개 로드하여 중첩하여 diff 뷰 가능.
