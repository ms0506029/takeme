import pandas as pd
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import os
import re
from datetime import datetime

class ExcelMergerTool:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("🔧 Excel融合程式 - Easy Store商品規格整合工具")
        self.root.geometry("1200x800")
        
        # 資料儲存
        self.easystore_data = None
        self.specs_data = None
        self.merged_data = None
        
        self.create_widgets()
        
    def create_widgets(self):
        # 主框架
        main_frame = tk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=15, pady=10)
        
        # 標題
        title_label = tk.Label(
            main_frame,
            text="🔧 Excel融合程式 - Easy Store商品規格整合工具",
            font=("Arial", 18, "bold"),
            fg="#2E86AB"
        )
        title_label.pack(pady=(0, 15))
        
        # 說明區域
        self.create_instructions(main_frame)
        
        # 檔案輸入區域
        self.create_file_input_area(main_frame)
        
        # 預覽區域
        self.create_preview_area(main_frame)
        
        # 操作按鈕
        self.create_action_buttons(main_frame)
        
        # 日誌區域
        self.create_log_area(main_frame)
        
    def create_instructions(self, parent):
        instruction_frame = tk.LabelFrame(parent, text="📋 使用說明", font=("Arial", 11, "bold"))
        instruction_frame.pack(fill=tk.X, pady=(0, 10))
        
        instructions = [
            "🎯 功能：將Easy Store匯出的基本商品資料與完整規格資料融合",
            "📁 輸入A：Easy Store匯出的商品Excel（有Handle、商品ID等基本資訊）",
            "📁 輸入B：批量上架系統匯出的規格Excel（有完整的顏色、尺寸組合）",
            "🔗 融合依據：通過「商品名稱」自動匹配兩個檔案的資料",
            "📊 輸出：可直接匯入Easy Store的完整Excel檔案"
        ]
        
        for instruction in instructions:
            label = tk.Label(instruction_frame, text=instruction, font=("Arial", 10), anchor="w")
            label.pack(fill=tk.X, padx=10, pady=2)
    
    def create_file_input_area(self, parent):
        file_frame = tk.LabelFrame(parent, text="📁 檔案輸入", font=("Arial", 11, "bold"))
        file_frame.pack(fill=tk.X, pady=(0, 10))
        
        # Easy Store 檔案
        easystore_frame = tk.Frame(file_frame)
        easystore_frame.pack(fill=tk.X, padx=10, pady=5)
        
        tk.Label(easystore_frame, text="📊 Easy Store匯出檔案：", font=("Arial", 10, "bold")).pack(side=tk.LEFT)
        self.easystore_path_var = tk.StringVar()
        tk.Entry(easystore_frame, textvariable=self.easystore_path_var, width=60, state="readonly").pack(side=tk.LEFT, padx=5)
        tk.Button(
            easystore_frame,
            text="瀏覽",
            command=self.select_easystore_file,
            bg="#007bff",
            fg="white"
        ).pack(side=tk.LEFT)
        
        # 規格檔案
        specs_frame = tk.Frame(file_frame)
        specs_frame.pack(fill=tk.X, padx=10, pady=5)
        
        tk.Label(specs_frame, text="🎨 規格資料檔案：", font=("Arial", 10, "bold")).pack(side=tk.LEFT)
        self.specs_path_var = tk.StringVar()
        tk.Entry(specs_frame, textvariable=self.specs_path_var, width=60, state="readonly").pack(side=tk.LEFT, padx=5)
        tk.Button(
            specs_frame,
            text="瀏覽",
            command=self.select_specs_file,
            bg="#28a745",
            fg="white"
        ).pack(side=tk.LEFT)
        
    def create_preview_area(self, parent):
        preview_frame = tk.LabelFrame(parent, text="👁️ 資料預覽", font=("Arial", 11, "bold"))
        preview_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        
        # 建立Notebook
        self.preview_notebook = ttk.Notebook(preview_frame)
        self.preview_notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # Easy Store資料預覽
        self.easystore_preview_frame = tk.Frame(self.preview_notebook)
        self.preview_notebook.add(self.easystore_preview_frame, text="Easy Store資料")
        
        # 規格資料預覽
        self.specs_preview_frame = tk.Frame(self.preview_notebook)
        self.preview_notebook.add(self.specs_preview_frame, text="規格資料")
        
        # 融合結果預覽
        self.merged_preview_frame = tk.Frame(self.preview_notebook)
        self.preview_notebook.add(self.merged_preview_frame, text="融合結果")
        
    def create_action_buttons(self, parent):
        button_frame = tk.Frame(parent)
        button_frame.pack(fill=tk.X, pady=10)
        
        # 分析檔案按鈕
        analyze_btn = tk.Button(
            button_frame,
            text="🔍 分析檔案",
            command=self.analyze_files,
            font=("Arial", 12, "bold"),
            bg="#17a2b8",
            fg="white",
            padx=20,
            pady=8
        )
        analyze_btn.pack(side=tk.LEFT, padx=10)
        
        # 執行融合按鈕
        merge_btn = tk.Button(
            button_frame,
            text="🔄 執行融合",
            command=self.merge_files,
            font=("Arial", 12, "bold"),
            bg="#fd7e14",
            fg="white",
            padx=20,
            pady=8
        )
        merge_btn.pack(side=tk.LEFT, padx=10)
        
        # 匯出結果按鈕
        export_btn = tk.Button(
            button_frame,
            text="💾 匯出融合結果",
            command=self.export_merged_data,
            font=("Arial", 12, "bold"),
            bg="#28a745",
            fg="white",
            padx=20,
            pady=8
        )
        export_btn.pack(side=tk.RIGHT, padx=10)
        
    def create_log_area(self, parent):
        log_frame = tk.LabelFrame(parent, text="📋 處理日誌", font=("Arial", 10, "bold"))
        log_frame.pack(fill=tk.X, pady=(0, 0))
        
        self.log_text = tk.Text(log_frame, height=8, wrap=tk.WORD)
        log_scrollbar = ttk.Scrollbar(log_frame, command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=log_scrollbar.set)
        
        self.log_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5, pady=5)
        log_scrollbar.pack(side=tk.RIGHT, fill=tk.Y, pady=5)
        
    def log_message(self, message):
        """記錄日誌訊息"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.see(tk.END)
        self.root.update()
        
    def select_easystore_file(self):
        """選擇Easy Store檔案"""
        file_path = filedialog.askopenfilename(
            title="選擇Easy Store匯出檔案",
            filetypes=[("Excel files", "*.xlsx"), ("CSV files", "*.csv")]
        )
        
        if file_path:
            self.easystore_path_var.set(file_path)
            self.log_message(f"✅ 已選擇Easy Store檔案：{os.path.basename(file_path)}")
            
    def select_specs_file(self):
        """選擇規格資料檔案"""
        file_path = filedialog.askopenfilename(
            title="選擇規格資料檔案",
            filetypes=[("Excel files", "*.xlsx"), ("CSV files", "*.csv")]
        )
        
        if file_path:
            self.specs_path_var.set(file_path)
            self.log_message(f"✅ 已選擇規格檔案：{os.path.basename(file_path)}")
            
    def analyze_files(self):
        """分析檔案內容"""
        easystore_path = self.easystore_path_var.get()
        specs_path = self.specs_path_var.get()
        
        if not easystore_path or not specs_path:
            messagebox.showerror("錯誤", "請先選擇兩個檔案")
            return
            
        try:
            # 讀取Easy Store檔案
            self.log_message("📊 分析Easy Store檔案...")
            if easystore_path.endswith('.xlsx'):
                self.easystore_data = pd.read_excel(easystore_path)
            else:
                self.easystore_data = pd.read_csv(easystore_path)
                
            self.log_message(f"   📋 Easy Store資料：{len(self.easystore_data)} 行，{len(self.easystore_data.columns)} 欄")
            self.log_message(f"   📋 欄位：{', '.join(self.easystore_data.columns[:5])}...")
            
            # 讀取規格檔案
            self.log_message("🎨 分析規格檔案...")
            if specs_path.endswith('.xlsx'):
                self.specs_data = pd.read_excel(specs_path)
            else:
                self.specs_data = pd.read_csv(specs_path)
                
            self.log_message(f"   📋 規格資料：{len(self.specs_data)} 行，{len(self.specs_data.columns)} 欄")
            self.log_message(f"   📋 欄位：{', '.join(self.specs_data.columns[:5])}...")
            
            # 分析匹配可能性
            self._analyze_matching_potential()
            
            # 更新預覽
            self._update_previews()
            
            self.log_message("✅ 檔案分析完成")
            messagebox.showinfo("分析完成", "檔案分析完成，請查看日誌了解詳情")
            
        except Exception as e:
            self.log_message(f"❌ 檔案分析失敗：{str(e)}")
            messagebox.showerror("分析失敗", f"錯誤：{str(e)}")
            
    def _analyze_matching_potential(self):
        """分析匹配可能性"""
        if self.easystore_data is None or self.specs_data is None:
            return
            
        # 嘗試找到商品名稱欄位
        easystore_name_col = None
        specs_name_col = None
        
        # Easy Store可能的名稱欄位
        for col in ['Title', 'title', '商品名稱', 'Name', 'name']:
            if col in self.easystore_data.columns:
                easystore_name_col = col
                break
                
        # 規格檔案可能的名稱欄位
        for col in ['Title', 'title', '商品名稱', 'Name', 'name']:
            if col in self.specs_data.columns:
                specs_name_col = col
                break
                
        if easystore_name_col and specs_name_col:
            easystore_names = set(self.easystore_data[easystore_name_col].dropna())
            specs_names = set(self.specs_data[specs_name_col].dropna())
            
            common_names = easystore_names.intersection(specs_names)
            
            self.log_message(f"🔗 匹配分析：")
            self.log_message(f"   Easy Store商品名稱欄位：{easystore_name_col}")
            self.log_message(f"   規格檔案名稱欄位：{specs_name_col}")
            self.log_message(f"   Easy Store商品數：{len(easystore_names)}")
            self.log_message(f"   規格檔案商品數：{len(specs_names)}")
            self.log_message(f"   可匹配商品數：{len(common_names)}")
            
            if len(common_names) > 0:
                self.log_message(f"   ✅ 發現可匹配商品：{list(common_names)[:3]}...")
            else:
                self.log_message(f"   ⚠️ 警告：沒有找到可匹配的商品名稱")
        else:
            self.log_message(f"⚠️ 警告：無法識別商品名稱欄位")
            
    def _update_previews(self):
        """更新預覽顯示"""
        # 清空現有預覽
        for widget in self.easystore_preview_frame.winfo_children():
            widget.destroy()
        for widget in self.specs_preview_frame.winfo_children():
            widget.destroy()
            
        # Easy Store資料預覽
        if self.easystore_data is not None:
            easystore_tree = ttk.Treeview(self.easystore_preview_frame, show="headings")
            
            # 顯示前5個欄位
            display_cols = list(self.easystore_data.columns[:5])
            easystore_tree["columns"] = display_cols
            
            for col in display_cols:
                easystore_tree.heading(col, text=col)
                easystore_tree.column(col, width=120)
                
            # 顯示前10行資料
            for _, row in self.easystore_data.head(10).iterrows():
                values = [str(row.get(col, ''))[:50] for col in display_cols]
                easystore_tree.insert("", "end", values=values)
                
            easystore_tree.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
            
        # 規格資料預覽
        if self.specs_data is not None:
            specs_tree = ttk.Treeview(self.specs_preview_frame, show="headings")
            
            # 顯示前5個欄位
            display_cols = list(self.specs_data.columns[:5])
            specs_tree["columns"] = display_cols
            
            for col in display_cols:
                specs_tree.heading(col, text=col)
                specs_tree.column(col, width=120)
                
            # 顯示前10行資料
            for _, row in self.specs_data.head(10).iterrows():
                values = [str(row.get(col, ''))[:50] for col in display_cols]
                specs_tree.insert("", "end", values=values)
                
            specs_tree.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
            
    def merge_files(self):
        """執行檔案融合"""
        if self.easystore_data is None or self.specs_data is None:
            messagebox.showerror("錯誤", "請先分析檔案")
            return
            
        try:
            self.log_message("🔄 開始執行融合...")
            
            # 智能識別名稱欄位
            easystore_name_col = self._find_name_column(self.easystore_data)
            specs_name_col = self._find_name_column(self.specs_data)
            
            if not easystore_name_col or not specs_name_col:
                raise Exception("無法識別商品名稱欄位")
                
            self.log_message(f"🔗 使用欄位進行匹配：{easystore_name_col} ↔ {specs_name_col}")
            
            # 執行融合邏輯
            merged_results = []
            
            # 按照規格檔案的每一行進行處理
            for _, specs_row in self.specs_data.iterrows():
                product_name = specs_row[specs_name_col]
                
                # 在Easy Store資料中找對應的商品
                matching_rows = self.easystore_data[
                    self.easystore_data[easystore_name_col] == product_name
                ]
                
                if len(matching_rows) > 0:
                    # 找到匹配的商品，融合資料
                    easystore_row = matching_rows.iloc[0]
                    merged_row = self._merge_single_product(easystore_row, specs_row)
                    merged_results.append(merged_row)
                    
                    self.log_message(f"✅ 融合商品：{product_name}")
                else:
                    self.log_message(f"⚠️ 找不到匹配商品：{product_name}")
                    
            if merged_results:
                self.merged_data = pd.DataFrame(merged_results)
                self.log_message(f"🎉 融合完成！共 {len(merged_results)} 行資料")
                
                # 更新融合結果預覽
                self._update_merged_preview()
                
                messagebox.showinfo("融合成功", f"成功融合 {len(merged_results)} 行資料")
            else:
                raise Exception("沒有成功融合任何資料")
                
        except Exception as e:
            self.log_message(f"❌ 融合失敗：{str(e)}")
            messagebox.showerror("融合失敗", f"錯誤：{str(e)}")
            
    def _find_name_column(self, df):
        """智能尋找名稱欄位"""
        possible_names = ['Title', 'title', '商品名稱', 'Name', 'name', 'Handle']
        for col in possible_names:
            if col in df.columns:
                return col
        return None
        
    def _merge_single_product(self, easystore_row, specs_row):
        """融合單一商品資料"""
        merged_row = {}
        
        # 優先使用Easy Store的基本資訊
        for col in self.easystore_data.columns:
            merged_row[col] = easystore_row[col]
            
        # 覆蓋或新增規格檔案的資訊
        for col in self.specs_data.columns:
            if col in ['Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value',
                      'SKU', 'Inventory', 'Price', 'Compare At Price']:
                merged_row[col] = specs_row[col]
        # ✅ 強制補完關鍵欄位
        if 'Option1 Name' in merged_row:
            if pd.isna(merged_row['Option1 Name']) or merged_row['Option1 Name'] == '' or merged_row['Option1 Name'] is None:
                merged_row['Option1 Name'] = '顏色'
        
        if 'Option2 Name' in merged_row:
            if pd.isna(merged_row['Option2 Name']) or merged_row['Option2 Name'] == '' or merged_row['Option2 Name'] is None:
                merged_row['Option2 Name'] = '尺寸'
        
        # F欄位統一設定
        merged_row['Taxable'] = 'No'
                
        return merged_row
        
    def _update_merged_preview(self):
        """更新融合結果預覽"""
        # 清空現有預覽
        for widget in self.merged_preview_frame.winfo_children():
            widget.destroy()
            
        if self.merged_data is not None:
            merged_tree = ttk.Treeview(self.merged_preview_frame, show="headings")
            
            # 顯示關鍵欄位
            key_cols = ['Handle', 'Title', 'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value', 'SKU']
            available_cols = [col for col in key_cols if col in self.merged_data.columns]
            
            merged_tree["columns"] = available_cols
            
            for col in available_cols:
                merged_tree.heading(col, text=col)
                merged_tree.column(col, width=100)
                
            # 顯示前15行資料
            for _, row in self.merged_data.head(15).iterrows():
                values = [str(row.get(col, ''))[:30] for col in available_cols]
                merged_tree.insert("", "end", values=values)
                
            merged_tree.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
            
    def export_merged_data(self):
        """匯出融合結果"""
        if self.merged_data is None:
            messagebox.showerror("錯誤", "請先執行融合")
            return
            
        file_path = filedialog.asksaveasfilename(
            defaultextension=".xlsx",
            filetypes=[("Excel files", "*.xlsx")],
            title="儲存融合結果",
            initialfile=f"Merged_Products_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"  # ← 正確！
        )
        
        if file_path:
            try:
                self.merged_data.to_excel(file_path, index=False)
                self.log_message(f"💾 融合結果已匯出：{file_path}")
                messagebox.showinfo("匯出成功", f"融合結果已匯出至：\n{os.path.basename(file_path)}")
            except Exception as e:
                self.log_message(f"❌ 匯出失敗：{str(e)}")
                messagebox.showerror("匯出失敗", f"錯誤：{str(e)}")
                
    def run(self):
        """運行工具"""
        self.root.mainloop()

if __name__ == "__main__":
    tool = ExcelMergerTool()
    tool.run()
