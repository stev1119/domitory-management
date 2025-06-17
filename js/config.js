// config.js - 시스템 설정
const CONFIG = {
    // Google Sheets 설정
    SHEET_ID: '1cASz2h4Dd13H6vhdKAPHOFdf5BMsFjaFledqVbzpP8I',
    SHEET_NAME: 'yulee',
    API_KEY: 'AIzaSyAAaDiNQC3o779j_4pzVC4ouuZr48Y-PbY', // 실제 API 키로 교체 필요
    
    // Jandi Webhook
    JANDI_WEBHOOK: 'https://wh.jandi.com/connect-api/webhook/29522216/3d9603c3b428b386c0d640758e236cb4',
    
    // 담당자 목록 (24명)
    MANAGERS: [
        '이영운', '김혜정', '이시우', '고승완', '남인달',
        '조영권', '황민철', '강지훈', '김건희', '송인수',
        '진정현', '유나경', '김미경', '원현주', '김지현',
        '김정아', '김영현', '신규1', '신규2', '신규3', '신규4',
        '신규5', '신규6', '신규7', '신규8
    ],
    
    // 기숙사 동 정보
    BUILDINGS: ['A', 'B', 'C', 'D', 'E', 'F'],
    FLOORS: [1, 2, 3, 4],
    
    // 성별 정보 (동별)
    GENDER_BY_BUILDING: {
        'A': '남', 'B': '남', 'C': '남', 'F': '남',
        'D': '여', 'E': '여'
    },
    
    // 호실 범위 정보
    ROOM_RANGES: {
        'A': { '1': '101-132', '2': '201-232', '3': '301-332', '4': '401-432' },
        'B': { '1': '101-121', '2': '201-221', '3': '301-321', '4': '401-421' },
        'C': { '1': '101-132', '2': '201-232', '3': '301-332', '4': '401-432' },
        'D': { '1': '101-123', '2': '201-223', '3': '301-323', '4': '401-423' },
        'E': { '1': '101-140', '2': '201-240', '3': '301-340', '4': '401-440' },
        'F': { '1': '101-117', '2': '201-217', '3': '301-317', '4': '401-417' }
    },
    
    // 시트 행 번호 매핑 (3인실 기준)
    SHEET_ROW_MAPPING: {
        'A4': { start: 187, end: 282 }, // A401~A432 (32개 호실 × 3명)
        'B4': { start: 405, end: 467 }, // B401~B421 (21개 호실 × 3명)
        'C4': { start: 653, end: 748 }, // C401~C432 (32개 호실 × 3명)
        'D4': { start: 883, end: 951 }, // D401~D423 (23개 호실 × 3명)
        'E4': { start: 1184, end: 1303 }, // E401~E440 (40개 호실 × 3명)
        'F4': { start: 1402, end: 1452 }  // F401~F417 (17개 호실 × 3명)
    },
    
    // 상태 타입
    STATUS_TYPES: [
        '외박', '외출', '퇴소', '이동+', '이동-', '정상', '기타'
    ],
    
    // 시간 설정 (보고 가능 시간: 22:00 ~ 21:59)
    REPORT_START_HOUR: 22,
    REPORT_END_HOUR: 21,
    REPORT_END_MINUTE: 59
};

// 유틸리티 함수들
const Utils = {
    // 현재 보고 기간 체크
    isValidReportTime() {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        // 22:00 이후거나 21:59 이전이면 유효
        return hour >= CONFIG.REPORT_START_HOUR || 
               (hour < CONFIG.REPORT_END_HOUR) || 
               (hour === CONFIG.REPORT_END_HOUR && minute <= CONFIG.REPORT_END_MINUTE);
    },
    
    // 보고 기간 ID 생성 (중복 체크용)
    getReportPeriodId() {
        const now = new Date();
        const hour = now.getHours();
        
        // 22시 이전이면 전날 기준, 22시 이후면 당일 기준
        if (hour < CONFIG.REPORT_START_HOUR) {
            now.setDate(now.getDate() - 1);
        }
        
        return now.toISOString().split('T')[0]; // YYYY-MM-DD 형식
    },
    
    // 호실 번호 생성
    generateRoomNumbers(building, floor) {
        const range = CONFIG.ROOM_RANGES[building][floor];
        const [start, end] = range.split('-').map(num => parseInt(num));
        const rooms = [];
        
        for (let i = start; i <= end; i++) {
            rooms.push(building + i.toString().padStart(3, '0'));
        }
        
        return rooms;
    },
    
    // 3인실 여부 확인
    isTripleRoom(roomNumber) {
        const floor = roomNumber.charAt(1);
        return floor === '4'; // 4층은 모두 3인실
    },
    
    // 현재 시간 문자열
    getCurrentTimeString() {
        return new Date().toLocaleString('ko-KR', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },
    
    // 동과 층으로 시트 행 범위 계산
    getSheetRowRange(building, floor) {
        const key = building + floor;
        return CONFIG.SHEET_ROW_MAPPING[key] || null;
    }
};
