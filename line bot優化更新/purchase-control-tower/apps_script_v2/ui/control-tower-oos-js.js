//=======================================
// 缺貨清單相關JavaScript函數
// 將此代碼添加到 control-tower.html 的 <script> 區塊中
// 插入位置：在 refreshBatches() 函數之後
//=======================================

// 刷新缺貨清單
function refreshOOSList() {
    callAPI('getOOSList', {}, function(data) {
        const tbody = document.getElementById('oosTable');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">無缺貨品項</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(item => `
            <tr>
                <td><input type="checkbox" class="form-check-input oos-checkbox" value="${item.rowIndex}"></td>
                <td>${item.esOrderNo}</td>
                <td>${item.sku}</td>
                <td>${item.productName}</td>
                <td>${item.color || ''}</td>
                <td>${item.size || ''}</td>
                <td>${item.qtyOrdered}</td>
                <td>${item.preorderMonth || ''} ${item.preorderXun || ''}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="markSinglePreorder(${item.rowIndex})">
                        預購
                    </button>
                </td>
            </tr>
        `).join('');
        
        setupOOSCheckboxes();
    });
}

// 設置缺貨勾選框
function setupOOSCheckboxes() {
    const selectAll = document.getElementById('selectAllOOS');
    const checkboxes = document.querySelectorAll('.oos-checkbox');
    
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
    }
}

// 標記預購（選取的）
function markPreorderSelected() {
    const checkboxes = document.querySelectorAll('.oos-checkbox:checked');
    const rows = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    if (rows.length === 0) {
        alert('請先勾選品項');
        return;
    }
    
    const month = prompt('請輸入預購月份（YYYY-MM）：');
    const xun = prompt('請輸入預購旬（上/中/下）：');
    
    if (!month || !xun) return;
    
    callAPI('markPreorder', { rowIndexes: rows, preMonth: month, preXun: xun }, function(data) {
        alert(`已標記 ${data.updated} 筆為預購`);
        refreshStatistics();
        refreshOOSList();
        refreshCandidates();
    }, function(error) {
        alert('操作失敗: ' + error);
    });
}

// 單筆標記預購
function markSinglePreorder(rowIndex) {
    const month = prompt('請輸入預購月份（YYYY-MM）：');
    const xun = prompt('請輸入預購旬（上/中/下）：');
    
    if (!month || !xun) return;
    
    callAPI('markPreorder', { rowIndexes: [rowIndex], preMonth: month, preXun: xun }, function(data) {
        alert('已標記為預購');
        refreshStatistics();
        refreshOOSList();
        refreshCandidates();
    }, function(error) {
        alert('操作失敗: ' + error);
    });
}

// 改回待購
function markBackToPending() {
    const checkboxes = document.querySelectorAll('.oos-checkbox:checked');
    const rows = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    if (rows.length === 0) {
        alert('請先勾選品項');
        return;
    }
    
    if (!confirm(`確定要將 ${rows.length} 筆改回待購嗎？`)) {
        return;
    }
    
    // 需要新增 API 端點或使用 QueueService 直接更新狀態為「待購」
    alert('此功能需要新增 markBackToPending API 端點到 Code.gs');
    // 暫時實現：
    // callAPI('markBackToPending', { rowIndexes: rows }, function(data) {
    //     alert(`已改回待購 ${data.updated} 筆`);
    //     refreshAll();
    // });
}
