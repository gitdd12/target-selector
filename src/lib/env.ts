// 환경변수 값 정리: 값 앞뒤 공백과, 윈도우 도구가 가끔 붙이는 눈에 안 보이는 표식(BOM)을 걷어낸다.
// (배포 때 이런 문자가 딸려 들어가면 "ByteString" 오류로 저장소·AI 접속이 통째로 실패한다.)
export const env = (name: string): string => (process.env[name] ?? "").replace(/^\uFEFF/, "").trim();
