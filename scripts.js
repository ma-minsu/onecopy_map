const parseCSVRow = row => {
    let insideQuotes = false;
    const columns = [];
    let currentColumn = '';

    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === ',' && !insideQuotes) {
            columns.push(currentColumn.trim());
            currentColumn = '';
        } else if (char === '"') {
            insideQuotes = !insideQuotes;
        } else {
            currentColumn += char;
        }
    }

    columns.push(currentColumn.trim());
    return columns;
};

// CSV 파일을 파싱하여 데이터 읽기
async function fetchCSVData() {
    try {
        const response = await fetch('data_20240621.csv');
        if (!response.ok) {
            throw new Error('Failed to fetch CSV data');
        }
        const data = await response.text();
        const rows = data.split('\n').slice(1); // 첫 번째 줄은 헤더이므로 제외
        const contractData = rows.map(row => {
            const columns = parseCSVRow(row);
            return {
                contractNo: columns[0],
                companyName: columns[1],
                address: columns[2],
                rentalMachine: columns[3],
                delayDays: columns[4],
                latitude: parseFloat(columns[5]), // 경도를 실수형으로 변환
                longitude: parseFloat(columns[6]) // 위도를 실수형으로 변환
            };
        });
        return contractData;
    } catch (error) {
        console.error('Error fetching CSV data:', error);
        return [];
    }
}

let map;
let markers = [];
let contractData = [];

// 지도 초기화 및 마커 표시
async function initMap() {
    try {
        const mapOptions = {
            center: new naver.maps.LatLng(37.5665, 126.9780), // 초기 지도 중심 좌표 (서울)
            zoom: 11
        };
        map = new naver.maps.Map('map', mapOptions);

        // CSV 데이터 가져오기
        contractData = await fetchCSVData();

        // 모든 계약 건수를 기반으로 마커 추가
        const groupedData = groupContractsByLocation(contractData);
        groupedData.forEach(contracts => {
            addMarker(contracts);
        });

        // 초기화 버튼 클릭 시
        document.getElementById('resetButton').addEventListener('click', function() {
            clearMarkers();
            groupedData.forEach(contracts => {
                addMarker(contracts);
            });
        });

        // 90일 이상 필터 버튼 클릭 시
        document.getElementById('filterButton').addEventListener('click', function() {
            clearMarkers();
            groupedData.forEach(contracts => {
                if (contracts.some(contract => parseInt(contract.delayDays) >= 90)) {
                    addMarker(contracts);
                }
            });
        });

        // 테이블에 모든 계약 정보 추가
        contractData.forEach(contract => {
            addToContractTable(contract);
        });

    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// 위치별로 계약 그룹화 함수
function groupContractsByLocation(contractData) {
    const grouped = {};
    contractData.forEach(contract => {
        const key = `${contract.latitude},${contract.longitude}`;
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(contract);
    });
    return Object.values(grouped);
}

// 마커 추가 함수
function addMarker(contracts) {
    const position = new naver.maps.LatLng(contracts[0].latitude, contracts[0].longitude);
    const contractNos = contracts.map(contract => contract.contractNo).join(', ');

    const marker = new naver.maps.Marker({
        position: position,
        map: map,
        title: `계약번호: ${contractNos} (계약 건수: ${contracts.length})`
    });
    markers.push(marker);

    // 마커에 정보 창 추가
    const infoWindow = new naver.maps.InfoWindow({
        content: createInfoWindowContent(contracts)
    });

    naver.maps.Event.addListener(marker, 'click', function() {
        if (infoWindow.getMap()) {
            infoWindow.close();
        } else {
            infoWindow.open(map, marker);
        }
    });
}

// 마커 제거 함수
function clearMarkers() {
    markers.forEach(marker => {
        marker.setMap(null);
    });
    markers = [];
}

// 정보 창 내용 생성 함수
function createInfoWindowContent(contracts) {
    let content = `<div style="padding:10px;">`;
    contracts.forEach(contract => {
        content += `계약번호: ${contract.contractNo}<br>`;
    });
    content += `계약 건수: ${contracts.length}`;
    return content;
}

// 테이블에 계약 정보 추가 함수
function addToContractTable(contract) {
    const tableBody = document.getElementById('contract-table-body');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>${contract.contractNo}</td>
        <td>${contract.companyName}</td>
        <td>${contract.address}</td>
        <td>${contract.rentalMachine}</td>
        <td>${contract.delayDays}</td>
        <td>${contract.latitude.toFixed(6)}</td>
        <td>${contract.longitude.toFixed(6)}</td>
    `;
    tableBody.appendChild(newRow);
}

// 페이지 로드 완료 후 지도 초기화
document.addEventListener('DOMContentLoaded', () => {
    initMap();
});
