// sheets-api.js - Google Sheets API 처리
class SheetsAPI {
    constructor() {
        this.baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}`;
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5분 캐시
    }
    
    // 시트 데이터 읽기
    async readRange(range) {
        const cacheKey = `read_${range}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }
        
        try {
            const url = `${this.baseUrl}/values/${CONFIG.SHEET_NAME}!${range}?key=${CONFIG.API_KEY}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`시트 읽기 실패: ${response.status}`);
            }
            
            const data = await response.json();
            const result = data.values || [];
            
            // 캐시 저장
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            return result;
        } catch (error) {
            console.error('시트 읽기 오류:', error);
            throw error;
        }
    }
    
    // 시트 데이터 쓰기
    async writeRange(range, values) {
        try {
            const url = `${this.baseUrl}/values/${CONFIG.SHEET_NAME}!${range}?valueInputOption=RAW&key=${CONFIG.API_KEY}`;
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    values: values
                })
            });
            
            if (!response.ok) {
                throw new Error(`시트 쓰기 실패: ${response.status}`);
            }
            
            // 관련 캐시 삭제
            this.clearCache();
            
            return await response.json();
        } catch (error) {
            console.error('시트 쓰기 오류:', error);
            throw error;
        }
    }
    
    // 특정 셀 업데이트
    async updateCell(row, col, value) {
        const range = `${this.columnToLetter(col)}${row}`;
        return await this.writeRange(range, [[value]]);
    }
    
    // 전체 학생 데이터 가져오기
    async getAllStudents() {
        try {
            // 전체 데이터 범위 읽기 (A:N열)
            const data = await this.readRange('A:N');
            const students = [];
            
            for (let i = 1; i < data.length; i++) { // 헤더 제외
                const row = data[i];
                if (row[1] && row[2]) { // B열(기숙사번호), C열(이름)이 있는 경우
                    students.push({
                        rowIndex: i + 1,
                        roomNumber: row[1] || '',
                        name: row[2] || '',
                        status: row[3] || '',
                        memo: row[4] || '',
                        parentPhone: row[5] || '',
                        studentPhone: row[6] || '',
                        labSeat: row[7] || '',
                        group: row[8] || '',
                        teacher: row[9] || '',
                        gender: row[11] || '',
                        admissionDate: row[12] || '',
                        building: row[1] ? row[1].charAt(0) : '',
                        floor: row[1] ? row[1].charAt(1) : '',
                        room: row[1] ? row[1].substring(1) : ''
                    });
                }
            }
            
            return students;
        } catch (error) {
            console.error('학생 데이터 가져오기 오류:', error);
            throw error;
        }
    }
    
    // 이름으로 학생 찾기
    async findStudentByName(name) {
        const students = await this.getAllStudents();
        return students.filter(student => 
            student.name.includes(name) || name.includes(student.name)
        );
    }
    
    // 기숙사 번호로 학생 찾기
    async findStudentByRoom(roomNumber) {
        const students = await this.getAllStudents();
        return students.filter(student => student.roomNumber === roomNumber);
    }
    
    // 라브 좌석으로 학생 찾기
    async findStudentByLabSeat(labSeat) {
        const students = await this.getAllStudents();
        return students.filter(student => student.labSeat === labSeat);
    }
    
    // 학생 상태 업데이트
    async updateStudentStatus(name, status, memo = '') {
        try {
            const students = await this.findStudentByName(name);
            if (students.length === 0) {
                throw new Error(`학생을 찾을 수 없습니다: ${name}`);
            }
            
            const student = students[0]; // 첫 번째 매치
            
            // D열(상태), E열(메모) 업데이트
            await this.updateCell(student.rowIndex, 4, status); // D열
            if (memo) {
                await this.updateCell(student.rowIndex, 5, memo); // E열
            }
            
            return student;
        } catch (error) {
            console.error('학생 상태 업데이트 오류:', error);
            throw error;
        }
    }
    
    // 특정 동/층의 학생들 가져오기
    async getStudentsByBuildingFloor(building, floor) {
        const students = await this.getAllStudents();
        return students.filter(student => 
            student.building === building && student.floor === floor.toString()
        );
    }
    
    // 캐시 삭제
    clearCache() {
        this.cache.clear();
    }
    
    // 컬럼 번호를 문자로 변환 (1=A, 2=B, ...)
    columnToLetter(col) {
        let letter = '';
        while (col > 0) {
            col--;
            letter = String.fromCharCode(65 + (col % 26)) + letter;
            col = Math.floor(col / 26);
        }
        return letter;
    }
    
    // 통계 데이터 계산
    async getStatistics() {
        try {
            const students = await this.getAllStudents();
            
            const stats = {
                total: students.length,
                current: 0,
                maleTotal: 0,
                femaleTotal: 0,
                maleCurrent: 0,
                femaleCurrent: 0,
                statusCounts: {},
                buildingStats: {},
                floorStats: {}
            };
            
            students.forEach(student => {
                const gender = CONFIG.GENDER_BY_BUILDING[student.building] || '기타';
                const status = student.status || '정상';
                
                // 성별 집계
                if (gender === '남') {
                    stats.maleTotal++;
                    if (status === '정상' || !status) {
                        stats.maleCurrent++;
                    }
                } else if (gender === '여') {
                    stats.femaleTotal++;
                    if (status === '정상' || !status) {
                        stats.femaleCurrent++;
                    }
                }
                
                // 현재원 계산 (정상인 학생)
                if (status === '정상' || !status) {
                    stats.current++;
                }
                
                // 상태별 집계
                stats.statusCounts[status] = (stats.statusCounts[status] || 0) + 1;
                
                // 동별 집계
                const buildingKey = student.building;
                if (!stats.buildingStats[buildingKey]) {
                    stats.buildingStats[buildingKey] = { total: 0, current: 0 };
                }
                stats.buildingStats[buildingKey].total++;
                if (status === '정상' || !status) {
                    stats.buildingStats[buildingKey].current++;
                }
                
                // 층별 집계
                const floorKey = `${student.building}${student.floor}`;
                if (!stats.floorStats[floorKey]) {
                    stats.floorStats[floorKey] = { total: 0, current: 0 };
                }
                stats.floorStats[floorKey].total++;
                if (status === '정상' || !status) {
                    stats.floorStats[floorKey].current++;
                }
            });
            
            return stats;
        } catch (error) {
            console.error('통계 계산 오류:', error);
            throw error;
        }
    }
}

// 전역 인스턴스
const sheetsAPI = new SheetsAPI();
