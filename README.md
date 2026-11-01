# 문장 성분 용의 성

중학교 3학년 국어 **문장 성분** 모둠 활동 게임입니다. 모둠별로 20층 성을 오르며 문제를 풀어 몬스터를 물리치고, 꼭대기의 용에게서 선생님을 구합니다.

- 학생 화면: `https://내-주소.onrender.com/` — 로그인 없이 이름만 입력
- 교사 화면: `https://내-주소.onrender.com/teacher` — 교사 비밀번호로 입장

외부 패키지 없이 Node.js 기본 기능만 사용하므로 설치할 것이 없습니다.

---

## 1. GitHub에 올리기

1. [github.com](https://github.com)에 로그인 → 오른쪽 위 **+** → **New repository**
2. 이름 예: `dragon-castle` → **Public** 또는 **Private** 아무거나 → **Create repository**
3. 새 저장소 화면에서 **uploading an existing file** 링크를 누름
4. 압축을 푼 `dragon-castle` 폴더 **안의 내용물 전부**(`server.js`, `package.json`, `render.yaml`, `README.md`, `public`, `server`, `data` 폴더)를 끌어다 놓음
   - 폴더째 끌어 놓으면 폴더 구조가 그대로 올라갑니다.
   - `.gitignore`처럼 점으로 시작하는 파일이 안 보이면 빼도 괜찮습니다.
5. 아래 **Commit changes** 클릭

## 2. Render에 배포하기

1. [render.com](https://render.com)에 GitHub 계정으로 가입·로그인
2. **New +** → **Web Service** → 방금 만든 GitHub 저장소 선택 (**Connect**)
3. 설정 값
   | 항목 | 값 |
   |---|---|
   | Name | `dragon-castle` (주소에 쓰임) |
   | Runtime / Language | `Node` |
   | Build Command | `npm install` |
   | Start Command | `node server.js` |
   | Instance Type | `Free` |
4. **Environment Variables** → **Add Environment Variable**
   - Key: `TEACHER_PASSWORD`
   - Value: 선생님만 아는 비밀번호 (예: `korean3-dragon`)
5. **Create Web Service** → 몇 분 뒤 `Live` 표시가 뜨면 완료

> 비밀번호를 정하지 않으면 기본값 `dragon1234`가 쓰입니다. 학생이 교사 화면에 들어오지 못하도록 꼭 바꿔 주세요.

## 3. 수업에서 쓰기

1. 수업 **5분 전**에 교사 화면(`/teacher`)을 엽니다. (무료 서버가 잠들어 있으면 깨어나는 데 1분쯤 걸립니다.)
2. **학생 입장 QR·링크** 버튼으로 QR을 화면에 띄웁니다.
3. 학생이 이름을 입력하면 입장 순서대로 모둠이 정해집니다. (설정의 ‘모둠 인원’, 기본 4명)
4. **게임 시작** → 진행 현황을 보며 덫을 놓거나 체력을 도와줍니다.
5. 다른 반 수업 전에는 **학생 · 모둠 → 전체 초기화**를 누릅니다.

## 무료 Render 서버에서 알아둘 점

- 15분 동안 아무도 접속하지 않으면 서버가 잠들고, 잠들면 **학생·모둠 기록이 초기화**됩니다. 수업 한 차시 안에서는 문제없습니다.
- 교사가 만든 문제는 교사 브라우저에 자동 보관되며, 서버가 초기화되면 교사 화면 위쪽에 **내 문제 다시 올리기** 버튼이 나타납니다. 그래도 **문제 관리 → 전체 복사**로 따로 보관해 두세요.
- 한 서버에서 한 번에 한 반(한 게임)만 진행합니다.

## 게임 규칙 요약

| 층 | 몬스터 공격력(오답 피해) |
|---|---|
| 1~5층 | 3 |
| 6~11층 | 5 |
| 12~16층 | 10 |
| 17~19층 | 15 |
| 20층 (용) | 20 |

- 체력 100, 0이 되면 1층부터 다시 (설정에서 ‘마지막 보물 층 다음부터’로 바꿀 수 있음)
- 보물: 5층(회복 물약, 현자의 힌트), 10층(회복 물약, 수호의 방패), 15층(회복 물약 2개, 현자의 힌트)
- 회복 물약 +10, 현자의 힌트(힌트 + 객관식이면 오답 2개 지우기), 수호의 방패(다음 피해 1번 막기)
- 덫: 밟으면 −5, 치료 문제를 맞히면 +8
- 문제 방식: 객관식과 단답형. 설정에서 ‘섞어서 / 성분 고르기는 모두 객관식 / 가능한 문제는 모두 단답형’ 선택. 문제마다 ‘항상 객관식/항상 단답형’도 지정 가능
- 단답형 채점은 띄어쓰기와 문장 부호를 무시합니다.

## 컴퓨터에서 직접 실행해 보기

Node.js 18 이상이 설치되어 있으면:

```
node server.js
```

학생: http://localhost:3000 · 교사: http://localhost:3000/teacher (비밀번호 `dragon1234`)

## 파일 구성

```
server.js          서버 (게임 규칙, 채점, 실시간 전송)
server/bank.js     기본 문제 은행
public/shared.js   공격력·보물·몬스터 이름 등 공통 값
public/common.js   도트 그림과 장면 애니메이션
public/student.*   학생 화면
public/teacher.*   교사 화면
public/style.css   화면 디자인
render.yaml        Render 설정 (Blueprint로 배포할 때 사용)
```
