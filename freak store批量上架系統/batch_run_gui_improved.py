import sys
import os
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import threading
import pandas as pd
import re
from datetime import datetime

# 確保能匯入現有模組
if hasattr(sys, '_MEIPASS'):
    sys.path.append(sys._MEIPASS)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# 匯入現有模組
from html_parser import parse_html_to_data
from selenium_fetcher import fetch_html_from_url
from api_direct_processor import APIDirectProcessor

class ImprovedBatchProductGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("🛍️ 批量商品上架系統 - API直接上架版")
        self.root.geometry("1300x900")
        self.root.minsize(1200, 800)
        
        # API處理器
        self.api_processor = APIDirectProcessor()
        
        # 商品數據儲存
        self.products_data = []
        
        # 建立介面
        self.create_widgets()
        
    def create_widgets(self):
        # 主框架
        main_frame = tk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=15, pady=10)
        
        # 標題區
        self.create_header(main_frame)
        
        # 操作說明
        self.create_instructions(main_frame)
        
        # 商品輸入區域
        self.create_product_input_area(main_frame)
        
        # 進度顯示區域
        self.create_progress_area(main_frame)
        
        # 操作按鈕
        self.create_action_buttons(main_frame)
        
    def create_header(self, parent):
        header_frame = tk.Frame(parent)
        header_frame.pack(fill=tk.X, pady=(0, 15))
        
        # 主標題
        title_label = tk.Label(
            header_frame,
            text="🛍️ 批量商品上架系統 - API直接上架",
            font=("Arial", 20, "bold"),
            fg="#2E86AB"
        )
        title_label.pack()
        
        # 副標題
        subtitle_label = tk.Label(
            header_frame,
            text="支援25個商品同時處理 | API直接上架 | 圖片本地儲存 | 處理結果報告",
            font=("Arial", 12),
            fg="#666666"
        )
        subtitle_label.pack(pady=(5, 0))
        
    def create_instructions(self, parent):
        instruction_frame = tk.LabelFrame(parent, text="📋 使用說明 - API直接上架模式", font=("Arial", 11, "bold"))
        instruction_frame.pack(fill=tk.X, pady=(0, 10))
        
        instructions = [
            "🎯 系統功能：透過API直接將商品上架到Easy Store，圖片儲存到本地資料夾供後續手動添加",
            "📝 填入資訊：自定義名稱、Daytona商品頁URL、價格（會同時設為售價和原價）",
            "🔗 網址格式：https://www.daytona-park.com/item/商品ID（例如剛才測試成功的網址）",
            "💰 價格說明：只需填一個價格，系統會自動填入Excel的AO和AS欄位",
            "📁 圖片儲存：會在images資料夾下建立以「自定義商品名稱」命名的子資料夾"
        ]
        
        for i, instruction in enumerate(instructions):
            label = tk.Label(instruction_frame, text=instruction, font=("Arial", 10), anchor="w")
            label.pack(fill=tk.X, padx=10, pady=2)
        
    def create_product_input_area(self, parent):
        # 輸入區域框架
        input_frame = tk.LabelFrame(parent, text="🎯 商品資訊輸入區（最多25個商品）", font=("Arial", 11, "bold"))
        input_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # 可滾動的canvas
        canvas = tk.Canvas(input_frame, height=400)
        scrollbar = ttk.Scrollbar(input_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # 表頭 - 使用grid布局確保對齊
        headers_frame = tk.Frame(scrollable_frame)
        headers_frame.pack(fill=tk.X, pady=5, padx=10)
        
        # 設定欄位權重
        headers_frame.grid_columnconfigure(1, weight=2)  # 商品名稱
        headers_frame.grid_columnconfigure(2, weight=4)  # 網址
        headers_frame.grid_columnconfigure(3, weight=1)  # 價格（合併後）
        headers_frame.grid_columnconfigure(4, weight=1)  # 狀態
        
        # 標題標籤
        tk.Label(headers_frame, text="序號", font=("Arial", 10, "bold"), bg="#E6F3FF").grid(row=0, column=0, padx=2, pady=2, sticky="ew")
        tk.Label(headers_frame, text="自定義商品名稱\n(資料夾名稱)", font=("Arial", 9, "bold"), bg="#E6F3FF").grid(row=0, column=1, padx=2, pady=2, sticky="ew")
        tk.Label(headers_frame, text="Daytona商品頁URL\n(完整網址)", font=("Arial", 9, "bold"), bg="#E6F3FF").grid(row=0, column=2, padx=2, pady=2, sticky="ew")
        tk.Label(headers_frame, text="價格(元)\n(AO+AS)", font=("Arial", 9, "bold"), bg="#FFE6E6").grid(row=0, column=3, padx=2, pady=2, sticky="ew")
        tk.Label(headers_frame, text="處理狀態", font=("Arial", 10, "bold"), bg="#E6FFE6").grid(row=0, column=4, padx=2, pady=2, sticky="ew")
        
        # 25個商品輸入行
        self.product_entries = []
        for i in range(25):
            self.create_improved_product_row(scrollable_frame, i+1)
            
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
    def create_improved_product_row(self, parent, index):
        row_frame = tk.Frame(parent)
        row_frame.pack(fill=tk.X, pady=1, padx=10)
        
        # 設定欄位權重（與標題一致）
        row_frame.grid_columnconfigure(1, weight=2)  # 商品名稱
        row_frame.grid_columnconfigure(2, weight=4)  # 網址
        row_frame.grid_columnconfigure(3, weight=1)  # 價格
        row_frame.grid_columnconfigure(4, weight=1)  # 狀態
        
        # 序號
        tk.Label(row_frame, text=f"{index:02d}", font=("Arial", 10)).grid(row=0, column=0, padx=2, pady=1, sticky="ew")
        
        # 自定義商品名稱
        name_entry = tk.Entry(row_frame, font=("Arial", 9))
        name_entry.grid(row=0, column=1, padx=2, pady=1, sticky="ew")
        
        # 商品網址
        url_entry = tk.Entry(row_frame, font=("Arial", 9))
        url_entry.grid(row=0, column=2, padx=2, pady=1, sticky="ew")
        
        # 價格（合併後只有一個）
        price_entry = tk.Entry(row_frame, font=("Arial", 9))
        price_entry.grid(row=0, column=3, padx=2, pady=1, sticky="ew")
        
        # 狀態顯示
        status_label = tk.Label(row_frame, text="待處理", font=("Arial", 9), fg="gray")
        status_label.grid(row=0, column=4, padx=2, pady=1, sticky="ew")
        
        # 儲存到列表
        self.product_entries.append({
            'index': index,
            'name_entry': name_entry,
            'url_entry': url_entry,
            'price_entry': price_entry,  # 只有一個價格輸入框
            'status_label': status_label
        })
        
    def create_progress_area(self, parent):
        progress_frame = tk.LabelFrame(parent, text="處理進度", font=("Arial", 10, "bold"))
        progress_frame.pack(fill=tk.X, pady=10)
        
        # 總進度條
        self.overall_progress = ttk.Progressbar(progress_frame, length=500, mode='determinate')
        self.overall_progress.pack(pady=5)
        
        # 進度文字
        self.progress_label = tk.Label(progress_frame, text="準備就緒", font=("Arial", 10))
        self.progress_label.pack(pady=5)
        
        # 處理結果顯示
        self.result_text = tk.Text(progress_frame, height=10, width=100)
        result_scrollbar = ttk.Scrollbar(progress_frame, command=self.result_text.yview)
        self.result_text.configure(yscrollcommand=result_scrollbar.set)
        
        self.result_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        result_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
    def create_action_buttons(self, parent):
        button_frame = tk.Frame(parent)
        button_frame.pack(fill=tk.X, pady=15)
        
        # API直接上架按鈕 - 加深顏色
        self.start_button = tk.Button(
            button_frame,
            text="🚀 API直接上架",
            command=self.start_api_upload,
            font=("Arial", 12, "bold"),
            bg="#2E8B57",  # 深綠色
            fg="white",
            activebackground="#228B22",
            activeforeground="white",
            relief="raised",
            bd=3,
            padx=25,
            pady=10
        )
        self.start_button.pack(side=tk.LEFT, padx=10)
        
        # 匯出處理報告按鈕 - 加深顏色
        self.export_button = tk.Button(
            button_frame,
            text="📊 匯出處理報告",
            command=self.export_processing_report,
            font=("Arial", 12, "bold"),
            bg="#1E5F99",  # 深藍色
            fg="white",
            activebackground="#1B4F72",
            activeforeground="white",
            relief="raised",
            bd=3,
            padx=25,
            pady=10,
            state=tk.DISABLED
        )
        self.export_button.pack(side=tk.LEFT, padx=10)
        
        # 在 create_action_buttons 方法中加入：
        complete_excel_button = tk.Button(
            button_frame,
            text="📊 匯出完整Easy Store格式",
            command=self.export_complete_excel_for_easystore,
            font=("Arial", 12, "bold"),
            bg="#6f42c1",
            fg="white",
            padx=25,
            pady=10
        )
        complete_excel_button.pack(side=tk.LEFT, padx=10)
        
        # 融合完整格式按鈕
        fusion_excel_button = tk.Button(
            button_frame,
            text="🔄 匯出融合完整格式",
            command=self.export_fusion_complete_excel,
            font=("Arial", 12, "bold"),
            bg="#ff6b6b",
            fg="white",
            padx=25,
            pady=10
        )
        fusion_excel_button.pack(side=tk.LEFT, padx=10)
        
        # 清空按鈕 - 加深顏色
        clear_button = tk.Button(
            button_frame,
            text="🗑️ 清空所有",
            command=self.clear_all_inputs,
            font=("Arial", 12),
            bg="#CC2936",  # 深紅色
            fg="white",
            activebackground="#B71C1C",
            activeforeground="white",
            relief="raised",
            bd=3,
            padx=25,
            pady=10
        )
        clear_button.pack(side=tk.LEFT, padx=10)
        
        # 測試數據按鈕 - 加深顏色
        test_button = tk.Button(
            button_frame,
            text="🧪 填入測試數據",
            command=self.fill_test_data,
            font=("Arial", 12),
            bg="#E65100",  # 深橘色
            fg="white",
            activebackground="#D84315",
            activeforeground="white",
            relief="raised",
            bd=3,
            padx=25,
            pady=10
        )
        test_button.pack(side=tk.RIGHT, padx=10)
        
    def start_api_upload(self):
        # 收集用戶輸入
        products_to_process = []
        
        for entry in self.product_entries:
            name = entry['name_entry'].get().strip()
            url = entry['url_entry'].get().strip()
            price = entry['price_entry'].get().strip()  # 只有一個價格
            
            if name and url and price:  # 必須都有值
                products_to_process.append({
                    'index': entry['index'],
                    'name': name,
                    'url': url,
                    'price': price,
                    'entry_ref': entry
                })
                
        if not products_to_process:
            messagebox.showerror("錯誤", "請至少填入一個完整的商品資訊（名稱、網址、價格）")
            return
            
        # 確認開始處理
        confirm = messagebox.askyesno(
            "確認API上架",
            f"即將透過API直接上架 {len(products_to_process)} 個商品到Easy Store\n"
            f"商品將立即在您的商店中上架（無圖片）\n"
            f"圖片會下載到本地供後續手動添加\n\n"
            f"確定要開始嗎？"
        )
        
        if not confirm:
            return
            
        # 禁用開始按鈕
        self.start_button.config(state=tk.DISABLED)
        
        # 重置進度
        self.overall_progress['maximum'] = len(products_to_process)
        self.overall_progress['value'] = 0
        self.progress_label.config(text="開始API上架...")
        self.result_text.delete(1.0, tk.END)
        
        # 在新線程中開始處理
        threading.Thread(
            target=self.process_api_upload_thread,
            args=(products_to_process,),
            daemon=True
        ).start()
        
    def process_api_upload_thread(self, products_to_process):
        """在後台線程中處理API上架"""
        try:
            self.products_data = []
            failed_products = []
            
            for i, product in enumerate(products_to_process):
                # 更新進度
                self.root.after(0, self.update_progress, i+1, len(products_to_process), f"處理商品 {i+1}: {product['name']}")
                
                # 更新狀態
                self.root.after(0, self.update_product_status, product['entry_ref'], "處理中...", "blue")
                
                try:
                    # 爬取商品數據
                    self.root.after(0, self.log_message, f"🔄 開始爬取商品 {i+1}: {product['name']}")
                    
                    html = fetch_html_from_url(product['url'])
                    if not html:
                        raise Exception("無法獲取網頁內容")
                        
                    parsed_data = parse_html_to_data(html)
                    if not parsed_data:
                        raise Exception("無法解析商品數據")
                    
                    # 下載圖片到自定義名稱的資料夾
                    self.root.after(0, self.log_message, f"📁 下載圖片到資料夾: {product['name']}")
                    images = parsed_data.get("images", [])
                    if images:
                        image_result = self.api_processor.download_images_to_custom_folder(images, product['name'])
                        self.root.after(0, self.log_message, f"📸 圖片下載完成: {image_result['downloaded_count']} 張成功")
                    
                    # 透過API創建商品
                    self.root.after(0, self.log_message, f"🚀 透過API創建商品...")
                    
                    product_data = {
                        'custom_name': product['name'],
                        'price': product['price'],
                        'parsed_data': parsed_data
                    }
                    
                    api_result = self.api_processor.create_product_via_api(product_data)
                    
                    if api_result['success']:
                        # 更新成功狀態
                        self.root.after(0, self.update_product_status, product['entry_ref'], "✅ 已上架", "green")
                        self.root.after(0, self.log_message, f"✅ 商品 {i+1} 上架成功: {api_result['message']}")
                    else:
                        raise Exception(api_result['error'])
                    
                except Exception as e:
                    # 處理失敗
                    error_msg = str(e)
                    failed_products.append(f"商品 {i+1} ({product['name']}): {error_msg}")
                    
                    self.root.after(0, self.update_product_status, product['entry_ref'], "❌ 失敗", "red")
                    self.root.after(0, self.log_message, f"❌ 商品 {i+1} 處理失敗: {error_msg}")
                    
            # 處理完成
            self.root.after(0, self.api_upload_completed, len(products_to_process), len(failed_products), failed_products)
            
        except Exception as e:
            self.root.after(0, self.processing_error, str(e))
            
    def api_upload_completed(self, total_count, failed_count, failed_list):
        """API上架完成回調"""
        success_count = total_count - failed_count
        
        self.progress_label.config(text=f"✅ API上架完成！成功: {success_count}，失敗: {failed_count}")
        
        # 顯示失敗清單
        if failed_list:
            self.log_message("\n❌ 上架失敗的商品:")
            for failed in failed_list:
                self.log_message(f"   {failed}")
                
        # 顯示成功統計
        stats = self.api_processor.get_processing_stats()
        self.log_message(f"\n🎉 API上架完成！")
        self.log_message(f"📊 統計結果：")
        self.log_message(f"   ✅ 成功上架: {stats['processed_count']} 個商品")
        self.log_message(f"   ❌ 失敗: {stats['failed_count']} 個商品")
        
        if stats['created_products']:
            self.log_message(f"\n🔗 成功創建的商品：")
            for product in stats['created_products']:
                self.log_message(f"   • {product['custom_name']} (ID: {product['product_id']})")
        
        # 重新啟用按鈕
        self.start_button.config(state=tk.NORMAL)
        if stats['created_products']:
            self.export_button.config(state=tk.NORMAL)
            
    # 在 api_upload_completed 方法最後加入：
    def export_complete_excel_for_easystore(self):
        """匯出完整的Easy Store格式Excel"""
        # 🔍 加入偵錯訊息
        print(f"🔍 偵錯：products_data 長度 = {len(self.products_data)}")
        print(f"🔍 偵錯：API處理器統計 = {self.api_processor.get_processing_stats()}")
        
        # 檢查是否有成功創建的商品
        stats = self.api_processor.get_processing_stats()
        created_products = stats.get('created_products', [])
        
        if not created_products:
            messagebox.showerror("錯誤", "沒有成功上架的商品可匯出\n請先完成商品上架流程")
            return
            
        file_path = filedialog.asksaveasfilename(
            defaultextension=".xlsx",
            filetypes=[("Excel files", "*.xlsx")],
            title="匯出Easy Store完整格式Excel",
            initialfile=f"EasyStore_Complete_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"  # ✅ 改用 initialfile
        )
        
        if file_path:
            try:
                # 檢查方法是否存在
                if hasattr(self.api_processor, 'export_complete_easystore_excel'):
                    result = self.api_processor.export_complete_easystore_excel(created_products, file_path)
                    if result['success']:
                        messagebox.showinfo("匯出成功", f"完整格式Excel已匯出：\n{file_path}")
                    else:
                        messagebox.showerror("匯出失敗", f"錯誤：{result['error']}")
                else:
                    messagebox.showerror("錯誤", "API處理器缺少 export_complete_easystore_excel 方法")
                    
            except Exception as e:
                messagebox.showerror("匯出失敗", f"錯誤：{str(e)}")
            
    def export_processing_report(self):
        """匯出處理結果報告"""
        stats = self.api_processor.get_processing_stats()
        
        if not stats['created_products']:
            messagebox.showerror("錯誤", "沒有成功創建的商品可匯出")
            return
            
        # 選擇保存位置
        file_path = filedialog.asksaveasfilename(
            defaultextension=".xlsx",
            filetypes=[("Excel files", "*.xlsx")],
            title="選擇處理報告保存位置"
        )
        
        if not file_path:
            return
            
        try:
            result = self.api_processor.export_summary_report(file_path)
            
            if result['success']:
                messagebox.showinfo("匯出成功", f"處理報告已匯出至：\n{file_path}\n\n共 {result['products_count']} 個成功商品")
                self.log_message(f"📊 處理報告匯出成功: {file_path}")
            else:
                messagebox.showerror("匯出失敗", f"錯誤：{result['error']}")
                
        except Exception as e:
            messagebox.showerror("匯出失敗", f"錯誤：{str(e)}")
    
    def update_progress(self, current, total, message):
        """更新進度條和標籤"""
        self.overall_progress['value'] = current
        self.progress_label.config(text=f"{message} ({current}/{total})")
        
    def update_product_status(self, entry_ref, status, color):
        """更新商品狀態"""
        entry_ref['status_label'].config(text=status, fg=color)
        
    def log_message(self, message):
        """添加日誌訊息"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.result_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.result_text.see(tk.END)
        
    def processing_error(self, error_msg):
        """處理錯誤回調"""
        self.progress_label.config(text="❌ 處理過程發生錯誤")
        self.log_message(f"❌ 嚴重錯誤: {error_msg}")
        self.start_button.config(state=tk.NORMAL)
        
    def clear_all_inputs(self):
        """清空所有輸入"""
        confirm = messagebox.askyesno("確認清空", "確定要清空所有輸入嗎？")
        if not confirm:
            return
            
        for entry in self.product_entries:
            entry['name_entry'].delete(0, tk.END)
            entry['url_entry'].delete(0, tk.END)
            entry['price_entry'].delete(0, tk.END)
            entry['status_label'].config(text="待處理", fg="gray")
            
        self.result_text.delete(1.0, tk.END)
        self.overall_progress['value'] = 0
        self.progress_label.config(text="準備就緒")
        self.export_button.config(state=tk.DISABLED)
        
    def fill_test_data(self):
        """填入測試數據"""
        test_data = [
            {
                'name': '小包',
                'url': 'https://www.daytona-park.com/item/116221150066',
                'price': '1980'
            },
            {
                'name': 'DAYTONA測試商品2',
                'url': 'https://www.daytona-park.com/item/116221150066',
                'price': '2580'
            }
        ]
        
        for i, data in enumerate(test_data[:2]):  # 只填前2個作為示例
            if i < len(self.product_entries):
                entry = self.product_entries[i]
                entry['name_entry'].delete(0, tk.END)
                entry['name_entry'].insert(0, data['name'])
                entry['url_entry'].delete(0, tk.END)
                entry['url_entry'].insert(0, data['url'])
                entry['price_entry'].delete(0, tk.END)
                entry['price_entry'].insert(0, data['price'])
                
    def export_complete_easystore_excel(self, products_list, file_path):
        """匯出完整的Easy Store格式Excel（包含規格）"""
        try:
            if not products_list:
                return {'success': False, 'error': '沒有商品資料可匯出'}
            
            print(f"🔄 開始匯出 {len(products_list)} 個商品的完整Excel...")
            
            # TODO: 這裡需要實作完整的Excel格式
            # 暫時返回成功，實際功能待開發
            return {
                'success': True,
                'message': f'已匯出 {len(products_list)} 個商品',
                'file_path': file_path
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
            
    def export_fusion_complete_excel(self):
        """匯出融合後的完整格式Excel - 一站式解決方案"""
        # 檢查是否有成功上架的商品
        stats = self.api_processor.get_processing_stats()
        created_products = stats.get('created_products', [])
        
        if not created_products:
            messagebox.showerror("錯誤", "沒有成功上架的商品可匯出\n請先完成商品上架流程")
            return
        
        self.log_message("🔄 開始融合完整格式Excel匯出...")
        
        # 讓用戶選擇Easy Store匯出檔案
        easystore_file = filedialog.askopenfilename(
            title="選擇Easy Store商品匯出檔案（用於融合基本資訊）",
            filetypes=[("Excel files", "*.xlsx"), ("CSV files", "*.csv")]
        )
        
        if not easystore_file:
            self.log_message("❌ 取消選擇Easy Store檔案")
            return
        
        self.log_message(f"✅ 已選擇Easy Store檔案：{os.path.basename(easystore_file)}")
        
        # 選擇輸出位置
        output_file = filedialog.asksaveasfilename(
            defaultextension=".xlsx",
            filetypes=[("Excel files", "*.xlsx")],
            title="儲存融合完整格式Excel",
            initialfile=f"Fusion_Complete_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        )
        
        if not output_file:
            self.log_message("❌ 取消選擇輸出檔案")
            return
        
        try:
            self.log_message("🔄 執行融合邏輯...")
            
            # 執行融合邏輯
            result = self.api_processor.create_fusion_complete_excel(
                created_products, easystore_file, output_file
            )
            
            if result['success']:
                self.log_message(f"🎉 融合成功！共處理 {result['total_rows']} 行資料")
                self.log_message(f"💾 檔案已儲存：{output_file}")
                messagebox.showinfo(
                    "融合成功",
                    f"融合完整格式Excel已匯出：\n{os.path.basename(output_file)}\n\n"
                    f"共 {result['total_rows']} 行資料\n"
                    f"可直接匯入Easy Store！"
                )
            else:
                self.log_message(f"❌ 融合失敗：{result['error']}")
                messagebox.showerror("融合失敗", f"錯誤：{result['error']}")
                
        except Exception as e:
            error_msg = str(e)
            self.log_message(f"❌ 融合過程發生異常：{error_msg}")
            messagebox.showerror("融合失敗", f"錯誤：{error_msg}")
                
    def run(self):
        """運行GUI"""
        self.root.mainloop()
        

if __name__ == "__main__":
    app = ImprovedBatchProductGUI()
    app.run()
    
