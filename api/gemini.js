// Vercel 서버리스 함수
// 키와 비밀번호는 서버에만 있고, 브라우저로 안 나갑니다.
//
// Vercel 설정 > Environment Variables 에 등록:
//   GEMINI_API_KEY = 구글에서 받은 Gemini 키
//   APP_PASSWORDS  = 비번 목록. 형식 →  영희:1111,철수:2222,대표:9999
//                    (이름은 표시용일 뿐, 비번만 맞으면 통과)
function validPasswords() {
  // "영희:1111,철수:2222" 에서 비번들만 뽑아냄 → ["1111","2222"]
  const raw = process.env.APP_PASSWORDS || '';
  const list = [];
  raw.split(',').forEach((pair) => {
    const i = pair.indexOf(':');
    const pw = i > 0 ? pair.slice(i + 1).trim() : pair.trim();
    if (pw) list.push(pw);
  });
  return list;
}
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST만 됩니다' });
  }
  // 1) 비밀번호 검사 (여러 개 중 하나라도 맞으면 통과)
  const sentPw = req.headers['x-app-pw'] || '';
  if (!validPasswords().includes(sentPw)) {
    return res.status(401).json({ error: '비밀번호가 틀렸습니다' });
  }
  // 2) 입장 확인 요청이면 여기서 끝
  if (req.body && req.body.__authcheck) {
    return res.status(200).json({ ok: true });
  }
  // 3) 비번 통과 → Gemini 호출
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({ error: '서버에 키가 설정되지 않았습니다' });
  }
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      }
    );
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: '서버 오류' });
  }
}
