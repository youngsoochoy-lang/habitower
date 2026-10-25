# Generates the curated course packs (claude-office/data/packs/*.json): shared, off until a user starts them in 📦 코스.
# Every quest follows Atomic Habits: small, with a cue (habit stack) and a two-minute easy version.
import json, os, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "packs")

def sub(id, ko, en, icon, pose):
    return {"id": id, "ko": ko, "en": en, "icon": icon, "verb": f"{ko} 하는 중", "pose": pose}

def cat(id, ko, en, icon, pose, subs):
    return {"id": id, "ko": ko, "en": en, "icon": icon, "verb": f"{ko} 하는 중", "pose": pose, "subs": subs}

def q(title, cat_, sub_, minutes, repeat, cue=None, easy=None, subtasks=None, times=None, days=None):
    o = {"title": title, "cat": cat_, "minutes": minutes, "repeat": repeat}
    if sub_: o["sub"] = sub_
    if times: o["times"] = times
    if days: o["days"] = days
    if cue: o["cue"] = cue
    if easy: o["easy"] = easy
    if subtasks: o["subtasks"] = subtasks
    return o

def stages(names, xp=(0, 1500, 6000, 20000)):
    ms = [None, {"streak": 14}, {"focused": 40}, {"streak": 60}]
    out = []
    for i, (ko, en, unlock) in enumerate(names):
        st = {"ko": ko, "en": en, "title": ko, "needXP": xp[i]}
        if ms[i]: st["milestone"] = ms[i]
        if i: st["perk"] = {"xp": [0, 0.05, 0.1, 0.15][i]}
        st["unlocks"] = [{"icon": unlock[0], "ko": unlock[1], **({"planned": True} if i else {})}]
        out.append(st)
    return out

def items(prefix, tiers):
    out = []
    for tier, names in tiers:
        for n in names:
            out.append({"id": f"{prefix}{len(out) + 1}", "ko": n, "tier": tier})
    return out

def weekly_hours(seed):
    m = {}
    for o in seed:
        if o["repeat"] == "once": continue
        per = len(o.get("days", range(7))) if o["repeat"] == "daily" else o.get("times", 1) / (4.33 if o["repeat"] == "monthly" else 1)
        m[o["cat"]] = m.get(o["cat"], 0) + o["minutes"] * per
    return {k: round(v / 60 * 2) / 2 for k, v in m.items()}

WEEKDAYS = [1, 2, 3, 4, 5]
packs = []

# ---------- 인플루언서 ----------
seed = [
  q("오늘의 콘텐츠 아이디어 3줄 메모", "inf_content", "idea", 3, "daily", "아침 커피 첫 모금 후", "제목 한 줄"),
  q("세로 영상 1컷 찍기 (일상 · 제품 · 장소)", "inf_content", "shoot", 5, "daily", "점심 먹으러 나갈 때", "사진 1장"),
  q("릴스·쇼츠 1편 편집 & 업로드", "inf_content", "edit", 30, "weekly", "화요일 저녁 식사 후", "훅 문장만 쓰기",
    ["첫 1초 훅", "컷 편집 · 자막", "트렌드 음원", "업로드 + 고정 댓글"], times=3),
  q("캐러셀 1개 (정보형 7장)", "inf_content", "edit", 40, "weekly", "토요일 오전", "표지 1장"),
  q("댓글·DM 10개 답하기", "inf_comm", "reply", 10, "daily", "퇴근길 지하철에서", "댓글 1개"),
  q("같은 분야 계정 5곳에 진심 댓글", "inf_comm", "network", 10, "daily", "점심 먹은 직후", "1곳"),
  q("라이브 또는 Q&A 스토리 1회", "inf_comm", "live", 30, "weekly", "일요일 저녁", "질문 스티커만 올리기"),
  q("주간 분석: 도달 · 저장 · 팔로우 전환 → 1가지 바꾸기", "inf_biz", "analytics", 15, "weekly", "일요일 저녁 설거지 후"),
  q("협찬·제휴 제안 1곳 보내기", "inf_biz", "deal", 20, "weekly", "수요일 점심 후", "브랜드 1곳 저장"),
  q("미디어킷 만들기 (팔로워 · 타깃 · 단가)", "inf_biz", "deal", 90, "once"),
  q("내 계정 콘셉트 한 문장 정하기", "inf_content", "idea", 30, "once"),
  q("롤모델 계정 10곳 분석 (훅 · 길이 · 업로드 주기)", "inf_biz", "analytics", 60, "once"),
]
packs.append({"pack": {"id": "influencer", "version": 1, "icon": "📱", "ko": "인플루언서", "en": "INFLUENCER",
                       "desc": "꾸준히 만들고 소통해서 팔로워 10만, 그리고 협찬으로 수익까지."},
  "areas": [{"id": "inf", "ko": "인플루언서", "en": "INFLUENCER", "icon": "📱", "categories": [
    cat("inf_content", "콘텐츠 제작", "CONTENT", "🎥", "type", [sub("idea", "기획", "IDEAS", "💡", "write"), sub("shoot", "촬영", "SHOOTING", "📸", "type"), sub("edit", "편집", "EDITING", "✂️", "type")]),
    cat("inf_comm", "커뮤니티", "COMMUNITY", "💬", "type", [sub("reply", "댓글·DM", "REPLIES", "💬", "type"), sub("network", "교류", "NETWORKING", "🤝", "type"), sub("live", "라이브", "LIVE", "🔴", "type")]),
    cat("inf_biz", "브랜딩·수익", "BRAND & DEALS", "💼", "write", [sub("analytics", "분석", "ANALYTICS", "📊", "read"), sub("deal", "협찬·제휴", "DEALS", "🤝", "write")])]}],
  "floors": [{"id": "life:inf", "name": "📱 인플루언서 스튜디오", "en": "INFLUENCER STUDIO", "rooms": [
    {"template": "video", "cat": "inf_content"}, {"template": "growth", "cat": "inf_comm", "tint": "#e8c4cf"}, {"template": "hustle", "cat": "inf_biz"}]}],
  "paths": [{"id": "influencer", "icon": "📱", "ko": "인플루언서", "en": "INFLUENCER", "desc": "만들고, 소통하고, 브랜드가 되는 길.",
    "categories": ["inf_content", "inf_comm", "inf_biz"],
    "stages": stages([("새싹 크리에이터", "SPROUT", ("📱", "인플루언서 배지")), ("마이크로 인플루언서", "MICRO", ("💍", "링라이트")),
                      ("인플루언서", "INFLUENCER", ("📸", "포토존 방")), ("셀럽", "CELEB", ("🌟", "레드카펫 지도"))])}],
  "goals": [{"id": "inf_followers", "icon": "📈", "ko": "팔로워", "kind": "number", "unit": "명",
             "milestones": [{"at": 1000, "ko": "1천"}, {"at": 10000, "ko": "1만 · 협찬 시작"}, {"at": 50000, "ko": "5만"}, {"at": 100000, "ko": "10만"}]},
            {"id": "inf_income", "icon": "💰", "ko": "월 협찬 수익", "kind": "number", "unit": "만원",
             "milestones": [{"at": 10, "ko": "첫 협찬"}, {"at": 100, "ko": "월 100만"}, {"at": 500, "ko": "월 500만"}]}],
  "seed": seed})

# ---------- K-pop 아이돌 ----------
seed = [
  q("보컬 발성 워밍업 (립트릴 · 허밍)", "idol_vocal", "warmup", 10, "daily", "아침 양치 끝나면", "허밍 1분"),
  q("곡 1절 녹음해서 들어보기", "idol_vocal", "song", 20, "daily", "저녁 식사 후", "후렴만"),
  q("음정·호흡 레슨 (트레이너)", "idol_vocal", "lesson", 60, "weekly", "레슨 전날 질문 1개 적기", "발성 연습 5분", times=2),
  q("안무 8카운트 따라 하기 (거울 앞)", "idol_dance", "choreo", 20, "daily", "샤워 전 거울 앞에서", "4카운트"),
  q("기본기: 아이솔레이션 · 리듬 타기", "idol_dance", "basics", 15, "daily", "안무 연습 직전", "목 아이솔 1분"),
  q("커버 영상 1편 촬영", "idol_dance", "cover", 45, "weekly", "토요일 오후", "후렴 15초만",
    ["곡 고르기", "전신 촬영", "다시 보고 고칠 점 3개"]),
  q("유연성 스트레칭", "idol_body", "flex", 10, "daily", "잠들기 전", "다리 찢기 1분"),
  q("체력: 줄넘기 · 인터벌", "idol_body", "cardio", 20, "weekly", "월 · 수 · 금 아침", "줄넘기 100개", times=3),
  q("카메라 앞 표정·엔딩 요정 연습", "idol_stage", "camera", 5, "daily", "셀카 찍기 전", "표정 3개"),
  q("외국어 인사·자기소개 1문장 (영어 · 일본어)", "idol_stage", "lang", 10, "daily", "출근·등교길", "단어 3개"),
  q("오디션 공고 확인 · 지원", "idol_stage", "audition", 20, "weekly", "일요일 저녁", "공고 1개 저장"),
  q("프로필 사진 · 자기소개 영상 만들기", "idol_stage", "audition", 90, "once"),
]
packs.append({"pack": {"id": "kpop-idol", "version": 1, "icon": "🎤", "ko": "K-pop 아이돌", "en": "K-POP IDOL",
                       "desc": "노래, 춤, 체력, 무대 매너를 매일 조금씩. 연습생에서 데뷔, 월드 투어까지."},
  "areas": [{"id": "idol", "ko": "아이돌 트레이닝", "en": "IDOL TRAINING", "icon": "🎤", "categories": [
    cat("idol_vocal", "보컬", "VOCAL", "🎙️", "read", [sub("warmup", "발성", "WARM-UP", "🎶", "read"), sub("song", "곡 연습", "SONGS", "🎵", "read"), sub("lesson", "레슨", "LESSONS", "🎓", "read")]),
    cat("idol_dance", "댄스", "DANCE", "💃", "dance", [sub("basics", "기본기", "BASICS", "🕺", "dance"), sub("choreo", "안무", "CHOREO", "💃", "dance"), sub("cover", "커버 영상", "COVERS", "📹", "type")]),
    cat("idol_body", "체력·유연성", "FITNESS", "🤸", "pilates", [sub("flex", "유연성", "FLEXIBILITY", "🤸", "pilates"), sub("cardio", "체력", "CARDIO", "🏃", "lift")]),
    cat("idol_stage", "무대·데뷔 준비", "STAGE", "🌟", "type", [sub("camera", "카메라 연습", "CAMERA", "📸", "type"), sub("lang", "외국어", "LANGUAGES", "🗣️", "read"), sub("audition", "오디션", "AUDITIONS", "📝", "write")])]}],
  "floors": [{"id": "life:idol", "name": "🎤 연습생 센터", "en": "TRAINEE CENTER", "rooms": [
    {"template": "piano", "cat": "idol_vocal", "tint": "#3a2a4a"}, {"template": "ballet", "cat": "idol_dance", "tint": "#d6b8e0"},
    {"template": "gym", "cat": "idol_body"}, {"template": "video", "cat": "idol_stage", "tint": "#4a2a3a"}]}],
  "paths": [{"id": "kpop-idol", "icon": "🎤", "ko": "K-pop 아이돌", "en": "K-POP IDOL", "desc": "연습생에서 데뷔, 월드 투어까지.",
    "categories": ["idol_vocal", "idol_dance", "idol_body", "idol_stage"],
    "stages": stages([("연습생", "TRAINEE", ("🎤", "연습생 명찰")), ("데뷔조", "DEBUT TEAM", ("🎧", "인이어")),
                      ("루키", "ROOKIE", ("🏆", "음악방송 1위 트로피")), ("월드 스타", "WORLD STAR", ("🌏", "월드 투어 지도"))])}],
  "goals": [{"id": "idol_road", "icon": "🌟", "ko": "데뷔까지", "kind": "checklist", "items": items("i", [
    ("기초", ["매일 발성 30일 연속", "안무 1곡 완곡", "커버 영상 5편"]),
    ("오디션", ["프로필 · 자기소개 영상 완성", "오디션 5곳 지원", "1차 합격"]),
    ("연습생", ["기획사 연습생 계약", "월말 평가 통과", "데뷔조 합류"])])},
    {"id": "idol_covers", "icon": "📹", "ko": "커버 영상 조회수", "kind": "number", "unit": "회",
     "milestones": [{"at": 1000, "ko": "1천"}, {"at": 10000, "ko": "1만"}, {"at": 100000, "ko": "10만"}]}],
  "seed": seed})

# ---------- 스시 셰프 ----------
seed = [
  q("칼 갈기 · 칼질 연습 (오이 돌려깎기)", "sushi_knife", "knife", 15, "daily", "저녁 준비 시작할 때", "칼 닦고 정리만"),
  q("밥 짓기 · 초대리 배합 1회", "sushi_rice", "rice", 20, "daily", "퇴근하고 손 씻자마자", "쌀 씻기만", days=WEEKDAYS),
  q("샤리 쥐기 20개 (무게 일정하게)", "sushi_rice", "nigiri", 15, "daily", "밥 지은 직후", "5개"),
  q("생선 손질 1마리 (3장 뜨기)", "sushi_knife", "fish", 45, "weekly", "토요일 아침 시장 다녀와서", "손질 영상 1편 보기", times=2),
  q("니기리 10종 연습 (참치 · 연어 · 광어 …)", "sushi_rice", "nigiri", 40, "weekly", "일요일 점심", "3종만"),
  q("생선·제철 공부 1종 (산지 · 맛 · 손질법)", "sushi_know", "fish", 10, "daily", "아침 커피 마시며", "이름만 외우기"),
  q("일본어 주방 용어 5개", "sushi_know", "lang", 10, "daily", "출근길", "1개"),
  q("오마카세 · 스시야 1곳 방문 노트", "sushi_know", "tasting", 90, "monthly", "월급날 주말", "가고 싶은 곳 1곳 저장", times=1),
  q("위생 · 원가 노트 정리", "sushi_biz", "cost", 20, "weekly", "금요일 저녁", "오늘 쓴 재료값만"),
  q("조리기능사 · 일식 자격증 일정 확인", "sushi_biz", "cert", 30, "once"),
  q("스시야 · 일식당 주방 보조 지원", "sushi_biz", "career", 60, "once"),
]
packs.append({"pack": {"id": "sushi-chef", "version": 1, "icon": "🍣", "ko": "스시 셰프", "en": "SUSHI CHEF",
                       "desc": "칼질, 샤리, 생선 공부를 매일. 견습생에서 내 이름을 건 오마카세까지."},
  "areas": [{"id": "sushi", "ko": "스시 수련", "en": "SUSHI TRAINING", "icon": "🍣", "categories": [
    cat("sushi_knife", "칼·손질", "KNIFE & FISH", "🔪", "cook", [sub("knife", "칼질", "KNIFE", "🔪", "cook"), sub("fish", "생선 손질", "FISH", "🐟", "cook")]),
    cat("sushi_rice", "샤리·니기리", "RICE & NIGIRI", "🍚", "cook", [sub("rice", "샤리", "RICE", "🍚", "cook"), sub("nigiri", "니기리", "NIGIRI", "🍣", "cook")]),
    cat("sushi_know", "식재료·일본어", "KNOWLEDGE", "📖", "read", [sub("fish", "제철 생선", "SEASONAL FISH", "🐟", "read"), sub("lang", "일본어", "JAPANESE", "🗾", "read"), sub("tasting", "시식 노트", "TASTING", "🍶", "write")]),
    cat("sushi_biz", "가게 운영", "RESTAURANT", "🏮", "write", [sub("cost", "위생·원가", "COSTS", "🧾", "write"), sub("cert", "자격증", "CERTIFICATES", "📜", "read"), sub("career", "커리어", "CAREER", "👘", "write")])]}],
  "floors": [{"id": "life:sushi", "name": "🍣 스시 카운터", "en": "SUSHI COUNTER", "rooms": [
    {"template": "chores", "cat": "sushi_knife", "tint": "#e6dccb"}, {"template": "chores", "cat": "sushi_rice", "tint": "#d8cbb2"},
    {"template": "learning", "cat": "sushi_know"}, {"template": "hustle", "cat": "sushi_biz", "tint": "#5a3a2a"}]}],
  "paths": [{"id": "sushi-chef", "icon": "🍣", "ko": "스시 셰프", "en": "SUSHI CHEF", "desc": "견습생에서 내 이름을 건 오마카세까지.",
    "categories": ["sushi_knife", "sushi_rice", "sushi_know", "sushi_biz"],
    "stages": stages([("견습생", "APPRENTICE", ("🍣", "견습생 머리띠")), ("니기리 담당", "NIGIRI COOK", ("🔪", "야나기바 칼")),
                      ("이타마에", "ITAMAE", ("🏮", "카운터 자리")), ("오너 셰프", "OWNER CHEF", ("🎌", "내 오마카세 가게"))])}],
  "goals": [{"id": "sushi_road", "icon": "🎌", "ko": "셰프의 길", "kind": "checklist", "items": items("s", [
    ("손", ["샤리 무게 오차 ±2g", "오이 돌려깎기 1m", "광어 3장 뜨기 10분 안에"]),
    ("자격", ["조리기능사 합격", "일식 주방 보조 3개월"]),
    ("무대", ["가족 오마카세 1회", "팝업 오마카세 1회", "내 가게 오픈"])])}],
  "seed": seed})

# ---------- 부자 은퇴 (파이어족) ----------
seed = [
  q("지출 기록 2분", "fire_money", "budget", 2, "daily", "저녁 먹고 핸드폰 들었을 때", "오늘 쓴 금액 하나"),
  q("투자 공부 1개 (책 10쪽 · 리포트 1편)", "fire_invest", "study", 15, "daily", "아침 커피 마시며", "1쪽"),
  q("포트폴리오 점검 · 리밸런싱 필요?", "fire_invest", "review", 15, "weekly", "일요일 아침 커피 후", "총액만 확인"),
  q("월 가계 결산 · 저축률 계산", "fire_money", "budget", 30, "monthly", "월급날 다음 날", "총수입 · 총지출만", times=1),
  q("고정비 1개 줄이기 (구독 · 통신 · 보험)", "fire_money", "cut", 20, "monthly", "월 결산 직후", "구독 목록 열어보기", times=1),
  q("부수입 아이디어 1개 실행", "fire_side", "side", 30, "weekly", "토요일 오전", "아이디어 메모 1줄"),
  q("배당 · 현금흐름 표 업데이트", "fire_invest", "cashflow", 20, "monthly", "배당 들어온 날", "입금 1건 기록", times=1),
  q("은퇴 후 하루 일과 상상해서 적기", "fire_life", "vision", 10, "weekly", "일요일 밤", "한 줄"),
  q("건강 루틴: 걷기 30분", "fire_life", "health", 30, "daily", "점심 먹은 직후", "5분 산책"),
  q("FIRE 숫자 계산 (연 지출 × 25)", "fire_money", "plan", 30, "once"),
  q("목표 자산배분 정하기", "fire_invest", "review", 45, "once"),
  q("비상금 6개월치 따로 두기", "fire_money", "plan", 20, "once"),
]
packs.append({"pack": {"id": "wealthy-retiree", "version": 1, "icon": "🏝️", "ko": "부자 은퇴 (파이어족)", "en": "EARLY RETIREE",
                       "desc": "저축률을 올리고, 꾸준히 투자하고, 은퇴 후의 삶까지 설계해요."},
  "areas": [{"id": "fire", "ko": "경제적 자유", "en": "FINANCIAL FREEDOM", "icon": "🏝️", "categories": [
    cat("fire_money", "돈 관리", "MONEY", "💵", "write", [sub("budget", "가계부", "BUDGET", "📒", "write"), sub("cut", "지출 줄이기", "CUTTING", "✂️", "write"), sub("plan", "재무 계획", "PLANNING", "🗺️", "write")]),
    cat("fire_invest", "투자", "INVESTING", "📈", "read", [sub("study", "공부", "STUDY", "📚", "read"), sub("review", "점검", "REVIEW", "🔍", "read"), sub("cashflow", "현금흐름", "CASH FLOW", "💸", "write")]),
    cat("fire_side", "부수입", "SIDE INCOME", "🪙", "type", [sub("side", "부업", "SIDE GIGS", "🪙", "type")]),
    cat("fire_life", "은퇴 후 삶", "LIFE AFTER", "🌴", "meditate", [sub("vision", "비전", "VISION", "🌅", "write"), sub("health", "건강", "HEALTH", "🚶", "meditate")])]}],
  "floors": [{"id": "life:fire", "name": "🏝️ 파이어 라운지", "en": "FIRE LOUNGE", "rooms": [
    {"template": "learning", "cat": "fire_money", "tint": "#c8b48a"}, {"template": "video", "cat": "fire_invest", "tint": "#2c3a33"},
    {"template": "hustle", "cat": "fire_side"}, {"template": "growth", "cat": "fire_life"}]}],
  "paths": [{"id": "wealthy-retiree", "icon": "🏝️", "ko": "부자 은퇴", "en": "EARLY RETIREE", "desc": "저축하는 사람에서 돈이 일하는 사람으로.",
    "categories": ["fire_money", "fire_invest", "fire_side"],
    "stages": stages([("저축가", "SAVER", ("🐷", "돼지 저금통")), ("투자자", "INVESTOR", ("📈", "트레이딩 모니터")),
                      ("자산가", "WEALTH BUILDER", ("🏦", "금고 방")), ("자유인", "FREE", ("🏝️", "해변 별장 지도"))])}],
  "goals": [{"id": "fire_networth", "icon": "💰", "ko": "순자산", "kind": "number", "unit": "만원",
             "milestones": [{"at": 10000, "ko": "1억"}, {"at": 50000, "ko": "5억"}, {"at": 100000, "ko": "10억"}, {"at": 200000, "ko": "20억"}]},
            {"id": "fire_rate", "icon": "🐷", "ko": "저축률", "kind": "number", "unit": "%",
             "milestones": [{"at": 30, "ko": "30%"}, {"at": 50, "ko": "50%"}, {"at": 70, "ko": "70%"}]}],
  "seed": seed})

# ---------- 개발자 ----------
seed = [
  q("알고리즘 1문제", "dev_cs", "algo", 25, "daily", "아침 커피 후 노트북 열면", "문제 읽기만", days=WEEKDAYS),
  q("사이드 프로젝트 커밋 1개", "dev_build", "project", 30, "daily", "저녁 식사 후", "README 한 줄 고치기"),
  q("기술 블로그·문서 1편 읽고 3줄 요약", "dev_cs", "read", 15, "daily", "점심 먹은 직후", "제목만 저장"),
  q("CS 기초 1주제 (네트워크 · OS · DB)", "dev_cs", "basics", 30, "weekly", "토요일 오전", "개념 1개"),
  q("오픈소스 이슈 1개 살펴보기 · 기여", "dev_build", "oss", 45, "weekly", "일요일 오후", "good first issue 1개 저장"),
  q("배운 것 블로그 글 1편", "dev_career", "write", 40, "weekly", "일요일 저녁", "제목 + 목차"),
  q("개발자 밋업 · 스터디 1회", "dev_career", "network", 60, "monthly", "월초 일정 확인", "밋업 1개 찜", times=2),
  q("이력서 · 포트폴리오 업데이트", "dev_career", "resume", 30, "monthly", "월말 회고 때", "프로젝트 한 줄 추가", times=1),
  q("GitHub 프로필 README 만들기", "dev_career", "resume", 45, "once"),
  q("배포까지 끝낸 미니 프로젝트 1개", "dev_build", "project", 240, "once"),
]
packs.append({"pack": {"id": "developer", "version": 1, "icon": "💻", "ko": "개발자", "en": "SOFTWARE ENGINEER",
                       "desc": "매일 한 문제, 한 커밋. 주니어에서 시니어, 그리고 테크 리드까지."},
  "areas": [{"id": "dev", "ko": "개발", "en": "ENGINEERING", "icon": "💻", "categories": [
    cat("dev_cs", "CS·알고리즘", "CS & ALGORITHMS", "🧠", "type", [sub("algo", "알고리즘", "ALGORITHMS", "🧩", "type"), sub("basics", "CS 기초", "CS BASICS", "📚", "read"), sub("read", "기술 읽기", "READING", "📰", "read")]),
    cat("dev_build", "만들기", "BUILDING", "🛠️", "type", [sub("project", "사이드 프로젝트", "SIDE PROJECT", "🚀", "type"), sub("oss", "오픈소스", "OPEN SOURCE", "🌍", "type")]),
    cat("dev_career", "커리어", "CAREER", "📈", "write", [sub("write", "기술 블로그", "BLOG", "✍️", "write"), sub("network", "네트워킹", "NETWORKING", "🤝", "type"), sub("resume", "이력서", "RESUME", "📄", "write")])]}],
  "floors": [{"id": "life:dev", "name": "💻 개발자 라운지", "en": "DEV LOUNGE", "rooms": [
    {"template": "learning", "cat": "dev_cs"}, {"template": "video", "cat": "dev_build"}, {"template": "hustle", "cat": "dev_career"}]}],
  "paths": [{"id": "developer", "icon": "💻", "ko": "개발자", "en": "SOFTWARE ENGINEER", "desc": "주니어에서 테크 리드까지.",
    "categories": ["dev_cs", "dev_build", "dev_career"],
    "stages": stages([("주니어", "JUNIOR", ("💻", "개발자 배지")), ("미드레벨", "MID-LEVEL", ("⌨️", "기계식 키보드")),
                      ("시니어", "SENIOR", ("🖥️", "듀얼 모니터")), ("테크 리드", "TECH LEAD", ("🏢", "스타트업 사무실 지도"))])}],
  "goals": [{"id": "dev_solved", "icon": "🧩", "ko": "푼 알고리즘 문제", "kind": "number", "unit": "개",
             "milestones": [{"at": 50, "ko": "50"}, {"at": 200, "ko": "200"}, {"at": 500, "ko": "500"}]},
            {"id": "dev_road", "icon": "🚀", "ko": "포트폴리오", "kind": "checklist", "items": items("d", [
              ("만들기", ["미니 프로젝트 배포", "사용자 10명", "오픈소스 PR 머지"]),
              ("알리기", ["기술 블로그 10편", "밋업 발표 1회"])])}],
  "seed": seed})

# ---------- 마라토너 ----------
seed = [
  q("러닝 (가볍게 · 대화 가능한 속도)", "run_train", "easy", 30, "weekly", "출근 전 운동화 현관에 두기", "10분만 달리기", times=3),
  q("장거리 러닝 (매주 1km씩 늘리기)", "run_train", "long", 75, "weekly", "토요일 아침", "평소 코스 1바퀴"),
  q("인터벌 · 템포런", "run_train", "speed", 40, "weekly", "수요일 퇴근 후", "질주 3번"),
  q("폼롤러 · 스트레칭 10분", "run_care", "stretch", 10, "daily", "샤워하고 나와서", "종아리만 2분"),
  q("코어 · 하체 보강 운동", "run_care", "strength", 20, "weekly", "월 · 목 저녁", "플랭크 1분", times=2),
  q("수면 7시간 (11시 전에 폰 내려놓기)", "run_care", "sleep", 2, "daily", "밤 10시 50분 알람"),
  q("러닝 기록 · 컨디션 1줄", "run_log", "log", 3, "daily", "러닝 끝나고 신발 벗자마자", "거리만"),
  q("대회 일정 확인 · 신청", "run_log", "race", 20, "monthly", "월초", "관심 대회 1개 저장", times=1),
  q("러닝화 · 페이스 존 정하기", "run_log", "race", 30, "once"),
]
packs.append({"pack": {"id": "marathoner", "version": 1, "icon": "🏃", "ko": "마라토너", "en": "MARATHONER",
                       "desc": "5km에서 풀코스까지. 달리기, 회복, 기록을 작게 꾸준히."},
  "areas": [{"id": "run", "ko": "러닝", "en": "RUNNING", "icon": "🏃", "categories": [
    cat("run_train", "훈련", "TRAINING", "🏃", "lift", [sub("easy", "이지런", "EASY RUN", "🏃", "lift"), sub("long", "장거리", "LONG RUN", "🛣️", "lift"), sub("speed", "스피드", "SPEED", "⚡", "lift")]),
    cat("run_care", "회복·보강", "RECOVERY", "🧘", "pilates", [sub("stretch", "스트레칭", "STRETCHING", "🧘", "pilates"), sub("strength", "보강 운동", "STRENGTH", "💪", "lift"), sub("sleep", "수면", "SLEEP", "😴", "meditate")]),
    cat("run_log", "기록·대회", "LOG & RACES", "📓", "write", [sub("log", "기록", "LOG", "📓", "write"), sub("race", "대회", "RACES", "🏅", "write")])]}],
  "floors": [{"id": "life:run", "name": "🏃 러닝 클럽", "en": "RUN CLUB", "rooms": [
    {"template": "gym", "cat": "run_train"}, {"template": "pilates", "cat": "run_care"}, {"template": "learning", "cat": "run_log", "tint": "#a8c4a0"}]}],
  "paths": [{"id": "marathoner", "icon": "🏃", "ko": "마라토너", "en": "MARATHONER", "desc": "5km에서 풀코스까지.",
    "categories": ["run_train", "run_care", "run_log"],
    "stages": stages([("런린이", "BEGINNER", ("👟", "러닝화")), ("10K 러너", "10K RUNNER", ("⌚", "러닝 워치")),
                      ("하프 마라토너", "HALF MARATHONER", ("🏅", "완주 메달")), ("풀코스 완주자", "MARATHONER", ("🏆", "보스턴 지도"))])}],
  "goals": [{"id": "run_race", "icon": "🏅", "ko": "대회 완주", "kind": "checklist", "items": items("r", [
              ("거리", ["5km 완주", "10km 완주", "하프 완주", "풀코스 완주"]),
              ("기록", ["10km 60분 안", "하프 2시간 안", "풀코스 4시간 30분 안"])])},
            {"id": "run_km", "icon": "🛣️", "ko": "올해 누적 거리", "kind": "number", "unit": "km",
             "milestones": [{"at": 100, "ko": "100km"}, {"at": 500, "ko": "500km"}, {"at": 1000, "ko": "1000km"}]}],
  "seed": seed})

os.makedirs(OUT, exist_ok=True)
for p in packs:
    p["weeklyHours"] = weekly_hours(p["seed"])
    titles = [o["title"] for o in p["seed"]]
    assert len(titles) == len(set(titles)) and all(len(t) <= 60 for t in titles), p["pack"]["id"]
    json.dump(p, open(os.path.join(OUT, p["pack"]["id"] + ".json"), "w"), ensure_ascii=False, indent=2)
    print(f'{p["pack"]["id"]:16} quests {len(p["seed"]):2} · {sum(p["weeklyHours"].values()):.1f} h/week')
# the online app (GitHub Pages) cannot list a folder, so it reads the pack files from this list
json.dump(sorted(f for f in os.listdir(OUT) if f.endswith(".json") and f != "index.json"), open(os.path.join(OUT, "index.json"), "w"), indent=2)
