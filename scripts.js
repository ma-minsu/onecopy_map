document.addEventListener('DOMContentLoaded', () => {
    initMap(); // 지도 초기화
    fetchUpdateDate();

    document.getElementById('resetButton').addEventListener('click', function() {
        updateMapAndTable(contractData); // 모든 마커와 테이블을 리셋
    });

    document.getElementById('filterButton').addEventListener('click', function() {
        const days = document.getElementById('delayInput').value;
        filterContractsByDelay(days); // 입력된 일수 이상 지연된 계약만 필터링
    });

    document.getElementById('tonerCheckButton').addEventListener('click', function() {
        filterContractsByTonerCheck(); // 토너 점검이 필요한 계약만 필터링
    });

    document.getElementById('vikoCheckButton').addEventListener('click', function() {
        filterContractsByVikoCheck(); // 토너 점검이 필요한 계약만 필터링
    });

    document.getElementById('showSelectedButton').addEventListener('click', function() {
        showSelectedContractsOnMap(); // 체크된 데이터만 지도에 표시
    });

    document.getElementById('invenCheckButton').addEventListener('click', async function() {
        await loadInventoryTable(); // INVENTORY 데이터 로드 및 테이블 업데이트
    });
});

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

function fetchUpdateDate() {
    $.ajax({
        url: 'data/date.txt',
        dataType: 'text',
        success: function(data) {
            $('#update-date').text(data);
        },
        error: function() {
            $('#update-date').text('Failed to fetch update date.');
        }
    });
}

function handleCheckboxChange() {
    const tableBody = document.getElementById('contract-table-body');
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    const fragment = document.createDocumentFragment();
    
    // 체크된 행과 체크되지 않은 행을 분류하여 fragment에 추가
    rows.forEach(row => {
        if (row.querySelector('.contract-checkbox').checked) {
            fragment.appendChild(row);
        }
    });
    
    rows.forEach(row => {
        if (!row.querySelector('.contract-checkbox').checked) {
            fragment.appendChild(row);
        }
    });
    
    // 테이블 본문을 비우고 fragment 추가
    tableBody.innerHTML = '';
    tableBody.appendChild(fragment);
}

function truncateText(text, maxLength) {
    if (text.length > maxLength) {
        return text.slice(0, maxLength) + '...';
    } else {
        return text;
    }
}

function showSelectedContractsOnMap() {
    const selectedContracts = contractData.filter(contract => {
        const checkbox = document.querySelector(`input[data-contract-no="${contract.contractNo}"]`);
        return checkbox && checkbox.checked;
    });
    updateMap(selectedContracts);
}

function updateMap(contractData) {
    clearMarkers();
    const groupedData = groupContractsByLocation(contractData);
    groupedData.forEach(contracts => {
        addMarker(contracts);
    });
}

async function fetchCSVData(fileName) {
    try {
        const response = await fetch(fileName);
        if (!response.ok) throw new Error(`Failed to fetch CSV data from ${fileName}`);
        const data = await response.text();
        return data.split('\n').slice(1).map(row => {
            const columns = parseCSVRow(row);
            return {
                contractNo: columns[0],
                companyName: columns[1],
                address: columns[2],
                rentalMachine: columns[3],
                delayDays: columns[4],
                latitude: parseFloat(columns[5]),
                longitude: parseFloat(columns[6]),
                tonerCheck: parseInt(columns[7]),
                vikoCheck: parseInt(columns[8])
            };
        });
    } catch (error) {
        console.error('Error fetching CSV data:', error);
        return [];
    }
}

async function loadInventoryTable() {
    try {
        const response = await fetch('data/warehouse.csv');
        if (!response.ok) throw new Error('Failed to fetch warehouse data');
        const data = await response.text();
        const rows = data.split('\n').slice(1); // 첫 번째 행은 헤더이므로 제외
        const tableBody = document.getElementById('contract-table-body');
        tableBody.innerHTML = ''; // 기존 테이블 내용 초기화

        rows.forEach(row => {
            const columns = parseCSVRow(row);
            const newRow = document.createElement('tr');
            columns.forEach(column => {
                const newCell = document.createElement('td');
                newCell.textContent = column.trim();
                newCell.classList.add('inventory-cell'); 
                newRow.appendChild(newCell);
            });
            tableBody.appendChild(newRow);
        });

        // 테이블 헤더 업데이트
        const tableHead = document.querySelector('.table thead');
        tableHead.innerHTML = `
            <tr>
                <th>상품종류</th>
                <th>상품명</th>
                <th>모델명</th>
                <th>색상</th>
                <th>재고</th>
            </tr>
        `;
    } catch (error) {
        console.error('Error fetching warehouse data:', error);
    }
}

function updateMapAndTable(contractData) {
    clearMarkers();
    const groupedData = groupContractsByLocation(contractData);
    groupedData.forEach(contracts => {
        addMarker(contracts);
    });
    refreshContractTable(contractData);
}

function filterContractsByDelay(days) {
    const delayDays = parseInt(days, 10);
    if (isNaN(delayDays)) {
        alert('유효한 숫자를 입력하세요.');
        return;
    }
    const filteredData = contractData.filter(contract => parseInt(contract.delayDays) >= delayDays);
    clearMarkers();
    const groupedData = groupContractsByLocation(filteredData);
    groupedData.forEach(contracts => {
        addMarker(contracts);
    });
    refreshContractTable(filteredData);
}

function filterContractsByTonerCheck() {
    const filteredData = contractData.filter(contract => contract.tonerCheck === 1);
    clearMarkers();
    const groupedData = groupContractsByLocation(filteredData);
    groupedData.forEach(contracts => {
        addMarker(contracts);
    });
    refreshContractTable(filteredData);
}

function filterContractsByVikoCheck() {
    const filteredData = contractData.filter(contract => contract.vikoCheck === 1);
    clearMarkers();
    const groupedData = groupContractsByLocation(filteredData);
    groupedData.forEach(contracts => {
        addMarker(contracts);
    });
    refreshContractTable(filteredData);
}


function refreshContractTable(contractData) {
    const tableBody = document.getElementById('contract-table-body');
    tableBody.innerHTML = ''; // Clear previous entries
    contractData.forEach(contract => {
        addToContractTable(contract);
    });
}

let map;
let markers = [];
let contractData = [];

async function initMap() {
    const mapOptions = {
        center: new naver.maps.LatLng(37.4792981, 127.0418488),
        zoom: 11
    };
    map = new naver.maps.Map('map', mapOptions);

    // Load initial data based on today's date
    const today = new Date();
    const formattedToday = formatDate(today);
    const fileName = `data/contract.csv`;

    contractData = await fetchCSVData(fileName);
    const filteredData = filterContractsByDelayInit(contractData, 90);
    updateMapAndTable(filteredData);

    // 지도 클릭 이벤트 리스너 추가
    naver.maps.Event.addListener(map, 'click', function() {
        if (activeInfoWindow) {
            activeInfoWindow.close();
            activeInfoWindow = null;
        }
    });
}

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

function filterContractsByDelayInit(contractData, days) {
    const delayDays = parseInt(days, 10);
    if (isNaN(delayDays)) {
        console.error('유효한 숫자가 아닙니다.');
        return contractData;
    }
    return contractData.filter(contract => parseInt(contract.delayDays) >= delayDays);
}

let activeInfoWindow; // 활성 정보 창을 추적하기 위한 변수

function addMarker(contracts) {
    const position = new naver.maps.LatLng(contracts[0].latitude, contracts[0].longitude);
    const marker = new naver.maps.Marker({
        position: position,
        map: map,
        title: `Contracts: ${contracts.map(c => c.contractNo).join(', ')}`
    });
    markers.push(marker);

    const infoWindow = new naver.maps.InfoWindow({
        content: createInfoWindowContent(contracts)
    });

    naver.maps.Event.addListener(marker, 'click', function() {
        if (activeInfoWindow) {
            activeInfoWindow.close();
        }
        infoWindow.open(map, marker);
        activeInfoWindow = infoWindow; // 새로운 정보 창을 활성 정보 창으로 설정

        // 체크박스 체크
        const contractNos = contracts.map(contract => contract.contractNo);
        contractNos.forEach(contractNo => {
            const checkbox = document.querySelector(`input[data-contract-no="${contractNo}"]`);
            if (checkbox) {
                checkbox.checked = true;
                checkbox.dispatchEvent(new Event('change')); // 체크박스 이벤트 트리거
            }
        });
    });
}

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    if (activeInfoWindow) {
        activeInfoWindow.close(); // 활성 정보 창 닫기
        activeInfoWindow = null; // 참조 제거
    }
}


function createInfoWindowContent(contracts) {
    return `<div style="padding:10px;">${contracts.map(contract => `Contract No: ${contract.contractNo}`).join('<br>')}</div>`;
}

function addToContractTable(contract) {
    const tableBody = document.getElementById('contract-table-body');
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="checkbox" class="contract-checkbox" data-contract-no="${contract.contractNo}"></td>
        <td class="clickable cell" onclick="generateNumURL('${contract.contractNo}')">${contract.contractNo}</td>
        <td class="clickable company-cell" onclick="generateCompanyURL('${contract.contractNo}')">${contract.companyName}</td>
        <td class="copyable address-cell" onclick="copyToClipboard(this)">${contract.address}</td>
        <td class="cell">${contract.rentalMachine}</td>
        <td class="day-cell">${contract.delayDays}</td>
        <td class="map">
            <div class="btn-container">
                <button onclick="openTMap(${contract.latitude}, ${contract.longitude}, '${contract.companyName}')" class="btn btn-icon">
                    <img src="TMAP logo.svg" alt="T맵">
                </button>
                <button onclick="openNaverMap(${contract.latitude}, ${contract.longitude}, '${contract.companyName}')" class="btn btn-icon">
                    <img src="NMAP logo.png" alt="NAVER">
                </button>
            </div>
        </td>
    `;
    tableBody.appendChild(newRow);

    // 테이블 헤더 업데이트
    const tableHead = document.querySelector('.table thead');
    tableHead.innerHTML = `
        <tr>
            <th>고정</th>
            <th>번호</th>
            <th>회사</th>
            <th>주소</th>
            <th>기계</th>
            <th>Day</th>
            <th>MAP</th>
        </tr>
    `;

    // 체크박스 이벤트 리스너 추가
    const checkbox = newRow.querySelector('.contract-checkbox');
    checkbox.addEventListener('change', handleCheckboxChange);
}

function formatDate(date) {
    return `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
}

function copyToClipboard(element) {
    const text = element.textContent; // 요소의 텍스트 내용 가져오기
    navigator.clipboard.writeText(text).then(() => {
        showToast("복사됨");
    }).catch(err => {
        console.error('클립보드 복사 실패:', err);
    });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;  // 메시지를 토스트 요소에 설정
    toast.style.display = 'block'; // 토스트를 보이게 함
    toast.style.opacity = 1; // 완전 불투명하게 함

    // 1초 후 토스트 숨기기
    setTimeout(() => {
        toast.style.opacity = 0; // 페이드 아웃
        setTimeout(() => {
            toast.style.display = 'none'; // 숨김
        }, 500); // opacity 전환 후 display 변경
    }, 1000);
}

function openTMap(lat, lon, name) {
    const encodedName = encodeURIComponent(name);
    const tmapUrl = `tmap://route?goalx=${lon}&goaly=${lat}&goalname=${encodedName}`;
    window.open(tmapUrl);
}

function openNaverMap(lat, lon, name) {
    const encodedName = encodeURIComponent(name);
    const naverMapUrl = `https://map.naver.com/v5/entry/address?c=/${lat},${lon},16/roadview&title=${encodedName}`;
    window.open(naverMapUrl, '_blank');
}

function generateCompanyURL(CompanyNum) {
    // URL 인코딩
    const encodedCompanyNum = encodeURIComponent(CompanyNum);

    // URL 생성
    const url = `http://viko.icanband.com/contract/simple_lookup?sort=&grade=all&search_type=contract_no&search_text=${encodedCompanyNum}`;

    // 링크로 이동
    window.open(url, '_blank');

}

function generateNumURL(CompanyNum) {
    // URL 인코딩
    const encodedCompanyNum = encodeURIComponent(CompanyNum);

    // URL 생성
    const url = `http://viko.icanband.com/system/toner_history?search_type=contract_no&search_text=${encodedCompanyNum}`;

    // 링크로 이동
    window.open(url, '_blank');

}

