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

document.addEventListener('DOMContentLoaded', () => {
    initMap(); // 지도 초기화

    $("#datepicker").datepicker({
        dateFormat: 'yymmdd', // 날짜 형식
        maxDate: 0, // 오늘 날짜까지 선택 가능
        minDate: -30, // 최대 30일 전까지 선택 가능
        onSelect: async function(dateText) {
            const fileName = `data/data_${dateText}.csv`;
            contractData = await fetchCSVData(fileName);
            const filteredData = filterContractsByDelayInit(contractData, 90);
            updateMapAndTable(filteredData);
        }
    });

    document.getElementById('resetButton').addEventListener('click', function() {
        updateMapAndTable(contractData); // 모든 마커와 테이블을 리셋
    });

    document.getElementById('filterButton').addEventListener('click', function() {
        const days = document.getElementById('delayInput').value;
        filterContractsByDelay(days); // 입력된 일수 이상 지연된 계약만 필터링
    });

    adjustFontSizeForAddresses();

});

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
                longitude: parseFloat(columns[6])
            };
        });
    } catch (error) {
        console.error('Error fetching CSV data:', error);
        return [];
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
    const fileName = `data/data_${formattedToday}.csv`;

    contractData = await fetchCSVData(fileName);
    const filteredData = filterContractsByDelayInit(contractData, 90);
    updateMapAndTable(filteredData);
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
        <td class="copyable" onclick="copyToClipboard(this)">${contract.contractNo}</td>
        <td class="clickable" onclick="generateCompanyURL('${contract.contractNo}')">${contract.companyName}</td>
        <td class="copyable address-cell" onclick="copyToClipboard(this)">${contract.address}</td>
        <td>${contract.rentalMachine}</td>
        <td>${contract.delayDays}</td>
        <td>
            <button onclick="openTMap(${contract.latitude}, ${contract.longitude}, '${contract.companyName}')" class="btn btn-icon" style="background: none; border: none; padding: 0;">
                <img src="TMAP logo.svg" alt="T맵" style="height: 30px;">
            </button>
        </td>
    `;
    tableBody.appendChild(newRow);
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

function generateCompanyURL(CompanyNum) {
    // URL 인코딩
    const encodedCompanyNum = encodeURIComponent(CompanyNum);

    // URL 생성
    const url = `http://viko.icanband.com/contract/simple_lookup?sort=&grade=all&search_type=contract_no&search_text=${encodedCompanyNum}`;

    // 링크로 이동
    window.open(url, '_blank');

}

function adjustFontSizeForAddresses() {
    const addresses = document.querySelectorAll('.table-responsive td.address-cell');

    addresses.forEach(address => {
        const contentLength = address.textContent.length;
        if (contentLength > 50) {
            address.style.fontSize = '12px';
        } else if (contentLength > 30) {
            address.style.fontSize = '14px';
        } else {
            address.style.fontSize = '16px';
        }
    });
}
