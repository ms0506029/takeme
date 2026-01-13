# sync_freak_discounts_gui.py
import tkinter as tk
from tkinter import messagebox, scrolledtext, ttk, filedialog
import threading
import pandas as pd
from datetime import datetime
import os
import sys
import json
import base64
from sync_freak_discounts import FreakDiscountSyncer
# 引入 Firefox 瀏覽器模組
# 正確的導入
from firefox_session import setup_firefox_session, cleanup_firefox_session


class DiscountSyncApp:
    def __init__(self, root):
        self.root = root
        root.title("Freak Store 折扣同步")
        root.geometry("700x650")
        
        # 設定檔案路徑
        self.config_file = "sync_config.json"
        self.urls_file_path = "tracked_urls.txt"
        
        # 初始化 log_box 為 None (避免日誌方法出錯)
        self.log_box = None
        
        # 讀取設定檔
        self.load_config()
        
        # 初始化基本屬性
        self.sync_results = []
        self.browser_logged_in = False
        
        # 建立框架 (這會創建 self.log_box)
        self.create_frames()
        
        # 初始化同步器
        self.syncer = FreakDiscountSyncer()
        
        # 載入追蹤URL (移到這裡，在 create_frames 之後)
        self.load_tracked_urls()
        
        # 在關閉視窗時清理瀏覽器
        root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
        # 如果有儲存的帳號密碼且設定自動登入，則自動登入
        if self.config.get('auto_login', False) and self.config.get('email') and self.config.get('password'):
            self.log("正在使用已儲存的帳號密碼自動登入...")
            self.login_freak_store()

    def load_config(self):
        """載入設定檔"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    self.config = json.load(f)
                    
                # 解密密碼（如果有）
                if 'password' in self.config and self.config['password']:
                    try:
                        self.config['password'] = self.decrypt_password(self.config['password'])
                    except:
                        self.config['password'] = ""
            else:
                self.config = {
                    'email': '',
                    'password': '',
                    'remember_credentials': False,
                    'auto_login': False,
                    'high_price_discount': False
                }
        except Exception as e:
            print(f"載入設定檔失敗: {e}")
            self.config = {
                'email': '',
                'password': '',
                'remember_credentials': False,
                'auto_login': False,
                'high_price_discount': False
            }

    def save_config(self):
        """儲存設定檔"""
        try:
            # 加密密碼後儲存
            config_to_save = self.config.copy()
            if config_to_save.get('password') and config_to_save.get('remember_credentials', False):
                config_to_save['password'] = self.encrypt_password(config_to_save['password'])
            elif not config_to_save.get('remember_credentials', False):
                config_to_save['password'] = ''
                
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config_to_save, f, indent=4)
                
        except Exception as e:
            print(f"儲存設定檔失敗: {e}")

    def encrypt_password(self, password):
        """簡單加密密碼（不是非常安全，但足夠基本保護）"""
        try:
            # 簡單的 Base64 編碼
            return base64.b64encode(password.encode('utf-8')).decode('utf-8')
        except:
            return ""

    def decrypt_password(self, encrypted):
        """解密密碼"""
        try:
            # 簡單的 Base64 解碼
            return base64.b64decode(encrypted.encode('utf-8')).decode('utf-8')
        except:
            return ""

    def create_frames(self):
        # 首先創建日誌區域，確保它最先被初始化
        log_frame = ttk.LabelFrame(self.root, text="執行日誌")
        log_frame.pack(fill='both', expand=True, padx=10, pady=5)
        
        self.log_box = scrolledtext.ScrolledText(log_frame, height=10)
        self.log_box.pack(fill='both', expand=True, padx=5, pady=5)
        
        # URL區域
        url_frame = ttk.LabelFrame(self.root, text="商品URL")
        url_frame.pack(fill='both', expand=True, padx=10, pady=5)
        
        # 按鈕列
        btn_frame = ttk.Frame(url_frame)
        btn_frame.pack(fill='x', side='top', padx=5, pady=5)
        
        ttk.Button(btn_frame, text="載入URL", command=self.load_url_file).pack(side='left', padx=5)
        ttk.Button(btn_frame, text="儲存URL", command=self.save_url_file).pack(side='left', padx=5)
        ttk.Button(btn_frame, text="新增URL", command=self.add_url).pack(side='left', padx=5)
        ttk.Button(btn_frame, text="移除所選", command=self.remove_selected_urls).pack(side='left', padx=5)
        
        # URL列表
        list_frame = ttk.Frame(url_frame)
        list_frame.pack(fill='both', expand=True, padx=5, pady=5)
        
        self.url_listbox = tk.Listbox(list_frame, selectmode=tk.EXTENDED)
        self.url_listbox.pack(side='left', fill='both', expand=True)
        
        scrollbar = ttk.Scrollbar(list_frame, orient='vertical', command=self.url_listbox.yview)
        scrollbar.pack(side='right', fill='y')
        self.url_listbox.config(yscrollcommand=scrollbar.set)
        
        # 折扣設定區域
        discount_frame = ttk.LabelFrame(self.root, text="折扣設定")
        discount_frame.pack(fill='x', padx=10, pady=5)
        
        # 新增按鈕到折扣設定區域
        ttk.Button(
            discount_frame,
            text="還原商品原價",
            command=self.restore_original_prices
        ).pack(pady=5)
        
        self.high_price_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(
            discount_frame,
            text="對折後價格>5000的商品額外折15%",
            variable=self.high_price_var
        ).pack(anchor='w', padx=10, pady=5)
        
        # 新增登入區域
        login_frame = ttk.Frame(discount_frame)  # 這裡定義了login_frame
        login_frame.pack(fill='x', padx=10, pady=5)
        
        ttk.Label(login_frame, text="會員登入設定:").grid(row=0, column=0, columnspan=2, sticky='w', padx=5, pady=2)
    
        ttk.Label(login_frame, text="Email:").grid(row=1, column=0, sticky='w', padx=5, pady=2)
        self.email_var = tk.StringVar(value=self.config.get('email', ''))
        ttk.Entry(login_frame, textvariable=self.email_var, width=30).grid(row=1, column=1, sticky='w', padx=5, pady=2)
        
        ttk.Label(login_frame, text="密碼:").grid(row=2, column=0, sticky='w', padx=5, pady=2)
        self.password_var = tk.StringVar(value=self.config.get('password', ''))
        self.password_entry = ttk.Entry(login_frame, textvariable=self.password_var, show="*", width=30)
        self.password_entry.grid(row=2, column=1, sticky='w', padx=5, pady=2)
        
        
        # 記住帳號密碼與自動登入選項
        options_frame = ttk.Frame(login_frame)
        options_frame.grid(row=3, column=0, columnspan=2, sticky='w', padx=5, pady=2)
        
        self.remember_var = tk.BooleanVar(value=self.config.get('remember_credentials', False))
        ttk.Checkbutton(
            options_frame,
            text="記住帳號密碼",
            variable=self.remember_var,
            command=self.update_credentials_settings
        ).pack(side='left', padx=5)
        
        self.autologin_var = tk.BooleanVar(value=self.config.get('auto_login', False))
        ttk.Checkbutton(
            options_frame,
            text="自動登入",
            variable=self.autologin_var,
            command=self.update_credentials_settings
        ).pack(side='left', padx=5)
        
        # 新增會員登入按鈕
        ttk.Button(
            discount_frame,
            text="Freak Store 會員登入",
            command=self.login_freak_store
        ).pack(pady=5)
        
        # 會員登入狀態指示
        self.login_status_var = tk.StringVar(value="尚未登入")
        self.login_status_label = ttk.Label(
            discount_frame,
            textvariable=self.login_status_var,
            foreground="red"
        )
        self.login_status_label.pack(pady=2)
        
        # 同步按鈕
        ttk.Button(
            discount_frame,
            text="開始同步折扣",
            command=self.start_sync
        ).pack(pady=10)
        
        # 進度條
        self.progress_var = tk.DoubleVar()
        self.progress = ttk.Progressbar(
            discount_frame,
            orient='horizontal',
            length=300,
            mode='determinate',
            variable=self.progress_var
        )
        self.progress.pack(fill='x', padx=10, pady=5)
        
        # 結果匯出按鈕
        ttk.Button(
            self.root,
            text="匯出同步結果",
            command=self.export_results
        ).pack(pady=10)

    # 還原原價方法 - 正確放置在類別層級
    def restore_original_prices(self):
        """還原商品到折扣前的原價"""
        urls = [self.url_listbox.get(i) for i in range(self.url_listbox.size())]
        if not urls:
            messagebox.showwarning("注意", "請先添加至少一筆 URL！")
            return
        
        if not self.browser_logged_in:
            if messagebox.askyesno("尚未登入", "您尚未登入 Freak Store 會員，無法獲取原價資訊。\n\n是否現在登入?"):
                self.login_freak_store()
                return
        
        # 確認是否繼續
        if not messagebox.askyesno("確認操作", "此操作將把所選商品的價格還原為原價 (無折扣)。\n\n確定繼續嗎？"):
            return
        
        # 重置進度條
        self.progress_var.set(0)
        self.progress['maximum'] = len(urls)
        
        # 清空之前的結果
        self.sync_results = []
        
        # 禁用按鈕
        self.disable_buttons()
        
        # 啟動還原線程
        threading.Thread(
            target=self.restore_prices_worker,
            args=(urls,),
            daemon=True
        ).start()

    def restore_prices_worker(self, urls):
        """還原原價處理線程"""
        total = len(urls)
        completed = 0
        success_count = 0
        fail_count = 0
        
        try:
            for url in urls:
                try:
                    # 更新進度
                    completed += 1
                    
                    # 獲取商品資訊
                    self.log(f"處理 [{completed}/{total}] {url}")
                    product_info = self.syncer.get_freak_product_info(url)
                    
                    # 獲取 Freak SKU 和對應的 Easy Store SKU
                    freak_sku = product_info['freak_sku']
                    
                    if freak_sku not in self.syncer.sku_map:
                        self.log(f"找不到對應的 Easy Store SKU: {freak_sku}")
                        fail_count += 1
                        continue
                        
                    easy_sku = self.syncer.sku_map[freak_sku]
                    
                    # 取得 Easy Store 商品資訊
                    variant_info = self.syncer.get_variant_id_by_sku(easy_sku)
                    product_id = variant_info["product_id"]
                    variant_id = variant_info["variant_id"]
                    
                    # 取得原價 (compare_at_price 或 Freak 原價)
                    original_price = variant_info.get("compare_at_price") or product_info["original_price"]
                    
                    # 更新價格為原價
                    update_result = self.syncer.update_variant_price(product_id, variant_id, original_price)
                    
                    # 儲存結果
                    result = {
                        'success': True,
                        'sku': freak_sku,
                        'easy_sku': easy_sku,
                        'url': url,
                        'original_price': original_price,
                        'product_id': product_id,
                        'variant_id': variant_id
                    }
                    
                    self.sync_results.append(result)
                    
                    # 更新日誌
                    success_count += 1
                    self.log(f"[成功] {freak_sku} → {easy_sku} - 已還原為原價: {original_price}")
                    
                except Exception as e:
                    fail_count += 1
                    self.log(f"[錯誤] 處理 {url} 時發生異常: {e}")
                    
                # 更新進度條
                self.progress_var.set(completed)
                
        except Exception as e:
            self.log(f"[嚴重錯誤] 還原價格過程中斷: {e}")
        finally:
            # 完成處理
            self.log(f"還原原價完成! 共處理 {total} 個 URL")
            
            # 顯示訊息框
            self.root.after(0, lambda: messagebox.showinfo("完成", f"所有商品價格還原已結束！\n成功: {success_count}\n失敗: {fail_count}"))
            
            # 恢復按鈕
            self.root.after(0, self.enable_buttons)
        
    def save_high_price_setting(self):
        """儲存高價商品折扣設定"""
        self.config['high_price_discount'] = self.high_price_var.get()
        self.save_config()

    def update_credentials_settings(self):
        """更新帳號密碼相關設定"""
        # 更新配置
        self.config['remember_credentials'] = self.remember_var.get()
        self.config['auto_login'] = self.autologin_var.get()
        
        # 如果勾選記住帳號密碼，立即儲存當前輸入值
        if self.remember_var.get():
            self.config['email'] = self.email_var.get()
            self.config['password'] = self.password_var.get()
        # 如果取消勾選，清除儲存的密碼
        else:
            self.config['password'] = ''
            
        # 如果勾選自動登入但沒有勾選記住帳號密碼，強制勾選記住帳號密碼
        if self.autologin_var.get() and not self.remember_var.get():
            self.remember_var.set(True)
            self.config['remember_credentials'] = True
            messagebox.showinfo("設定說明", "已自動勾選「記住帳號密碼」，因為自動登入需要儲存帳號密碼")
            
        # 儲存設定
        self.save_config()

    def test_credentials(self):
        """測試輸入的帳號密碼是否有效"""
        email = self.email_var.get()
        password = self.password_var.get()
        
        if not email or not password:
            messagebox.showwarning("資料不完整", "請輸入會員帳號和密碼")
            return
            
        self.log(f"正在測試帳號 {email} 的登入...")
        self.login_status_var.set("測試登入中...")
        
        # 禁用按鈕
        self.disable_buttons()
        
        # 啟動測試線程
        threading.Thread(
            target=self.test_login_worker,
            args=(email, password),
            daemon=True
        ).start()
        
    def test_login_worker(self, email, password):
        """測試登入處理線程"""
        try:
            # 使用無頭模式測試登入
            success = login_with_credentials(email, password, headless=True)
            
            if success:
                # 更新UI
                self.root.after(0, lambda: self.login_status_label.config(foreground="green"))
                self.root.after(0, lambda: self.log(f"帳號 {email} 登入測試成功!"))
                self.root.after(0, lambda: messagebox.showinfo("測試成功", "會員帳號和密碼測試成功!"))
                
                # 更新設定檔
                if self.remember_var.get():
                    self.config['email'] = email
                    self.config['password'] = password
                    self.save_config()
                    
                # 更新登入狀態標籤顏色
                self.root.after(0, lambda: self.login_status_label.config(foreground="green"))
            else:
                # 登入失敗
                self.root.after(0, lambda: self.login_status_label.config(foreground="red"))
                self.root.after(0, lambda: self.log(f"帳號 {email} 登入測試失敗!"))
                self.root.after(0, lambda: messagebox.showerror("測試失敗", "會員帳號或密碼錯誤!"))
                
                # 更新登入狀態標籤顏色
                self.root.after(0, lambda: self.root.nametowidget(
                    self.login_status_var.cget("textvariable").replace(".", "")
                ).config(foreground="red"))
                
        except Exception as e:
            self.root.after(0, lambda: self.login_status_var.set("測試過程出錯"))
            self.root.after(0, lambda: self.log(f"登入測試過程發生錯誤: {e}"))
            self.root.after(0, lambda: messagebox.showerror("測試錯誤", f"測試過程中發生錯誤:\n{e}"))
        finally:
            # 恢復按鈕
            self.root.after(0, self.enable_buttons)

    def login_freak_store(self):
        """登入Freak Store會員"""
        self.log("開始Freak Store會員登入流程...")
        
        # 禁用按鈕，防止重複點擊
        self.disable_buttons()
        self.login_status_var.set("登入中...")
        
        # 在新線程中執行登入，避免卡住UI
        threading.Thread(
            target=self.login_worker,
            daemon=True
        ).start()
    
    def login_worker(self):
        """會員登入處理線程"""
        try:
            # 呼叫 Firefox 模組的初始化函數
            setup_firefox_session()
            
            # 更新登入狀態
            self.browser_logged_in = True
            self.root.after(0, lambda: self.login_status_var.set("已登入"))
            self.root.after(0, lambda: self.log("Freak Store 會員登入成功!"))
            
            # 更新登入狀態標籤顏色
            self.root.after(0, lambda: self.login_status_label.config(foreground="green"))
            
        except Exception as e:
            # 捕獲錯誤訊息
            error_message = str(e)
            self.root.after(0, lambda: self.login_status_var.set("登入過程出錯"))
            self.root.after(0, lambda message=error_message: self.log(f"Freak Store 會員登入失敗: {message}"))
        finally:
            # 恢復按鈕
            self.root.after(0, self.enable_buttons)
    
    def on_closing(self):
        """關閉視窗時的處理"""
        try:
            # 清理 Firefox 會話
            cleanup_firefox_session()
            self.log("已清理瀏覽器會話")
        except:
            pass
        # 關閉視窗
        self.root.destroy()
        sys.exit(0)

    def load_tracked_urls(self):
        """載入追蹤URL"""
        try:
            if os.path.exists(self.urls_file_path):
                with open(self.urls_file_path, 'r', encoding='utf-8') as f:
                    urls = [line.strip() for line in f if line.strip()]
                    
                # 清空並填充列表
                self.url_listbox.delete(0, tk.END)
                for url in urls:
                    self.url_listbox.insert(tk.END, url)
                    
                self.log(f"已載入 {len(urls)} 個追蹤URL")
            else:
                self.log("找不到追蹤URL檔案")
        except Exception as e:
            self.log(f"載入URL失敗: {e}")

    def load_url_file(self):
        """載入URL檔案"""
        filepath = filedialog.askopenfilename(
            title="選擇URL檔案",
            filetypes=[("文字檔案", "*.txt"), ("所有檔案", "*.*")]
        )
        if filepath:
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    urls = [line.strip() for line in f if line.strip()]
                
                # 更新檔案路徑
                self.urls_file_path = filepath
                
                # 清空並填充列表
                self.url_listbox.delete(0, tk.END)
                for url in urls:
                    self.url_listbox.insert(tk.END, url)
                    
                self.log(f"已載入 {len(urls)} 個URL從 {os.path.basename(filepath)}")
            except Exception as e:
                self.log(f"載入URL檔案失敗: {e}")

    def save_url_file(self):
        """儲存URL檔案"""
        urls = [self.url_listbox.get(i) for i in range(self.url_listbox.size())]
        if not urls:
            messagebox.showinfo("提示", "沒有URL可儲存")
            return
            
        filepath = filedialog.asksaveasfilename(
            title="儲存URL檔案",
            defaultextension=".txt",
            filetypes=[("文字檔案", "*.txt"), ("所有檔案", "*.*")],
            initialfile="tracked_urls.txt"
        )
        if filepath:
            try:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(urls))
                self.log(f"已儲存 {len(urls)} 個URL至 {os.path.basename(filepath)}")
            except Exception as e:
                self.log(f"儲存URL檔案失敗: {e}")

    def add_url(self):
        """新增URL"""
        def add():
            url = entry.get().strip()
            if url:
                if "http" not in url:
                    messagebox.showwarning("格式錯誤", "請輸入完整URL，包含http://或https://")
                    return
                self.url_listbox.insert(tk.END, url)
                entry.delete(0, tk.END)
                self.log(f"已新增URL: {url}")
            
        dialog = tk.Toplevel(self.root)
        dialog.title("新增商品URL")
        dialog.geometry("500x100")
        dialog.resizable(False, False)
        
        ttk.Label(dialog, text="輸入完整商品URL:").pack(padx=10, pady=5)
        
        entry = ttk.Entry(dialog, width=50)
        entry.pack(padx=10, pady=5, fill='x')
        entry.focus_set()
        
        btn_frame = ttk.Frame(dialog)
        btn_frame.pack(padx=10, pady=5)
        
        ttk.Button(btn_frame, text="新增", command=add).pack(side='left', padx=5)
        ttk.Button(btn_frame, text="關閉", command=dialog.destroy).pack(side='left', padx=5)

    def remove_selected_urls(self):
        """移除所選URL"""
        selected = self.url_listbox.curselection()
        if not selected:
            messagebox.showinfo("提示", "請先選擇要移除的URL")
            return
            
        # 從後向前刪除，避免索引變動問題
        for i in sorted(selected, reverse=True):
            self.url_listbox.delete(i)
            
        self.log(f"已移除 {len(selected)} 個URL")

    def log(self, msg):
        """添加日誌訊息"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        # 首先輸出到控制台
        print(f"[{timestamp}] {msg}")
        
        # 如果 log_box 已經存在，則也輸出到 GUI
        if hasattr(self, 'log_box') and self.log_box:
            try:
                self.log_box.insert(tk.END, f"[{timestamp}] {msg}\n")
                self.log_box.see(tk.END)
            except Exception as e:
                print(f"無法寫入 GUI 日誌: {e}")

    def start_sync(self):
        """開始同步折扣"""
        urls = [self.url_listbox.get(i) for i in range(self.url_listbox.size())]
        if not urls:
            messagebox.showwarning("注意", "請先添加至少一筆URL！")
            return
        
        # 檢查是否已登入
        if not self.browser_logged_in:
            if messagebox.askyesno("尚未登入", "您尚未登入Freak Store會員，這可能會導致無法獲取會員專屬折扣資訊。\n\n是否現在登入?"):
                self.login_freak_store()
                return
        
        # 重置進度條
        self.progress_var.set(0)
        self.progress['maximum'] = len(urls)
        
        # 清空之前的結果
        self.sync_results = []
        
        # 詢問是否對高價商品額外折扣
        apply_additional_discount = self.high_price_var.get()
        
        # 禁用按鈕，防止重複點擊
        self.disable_buttons()
        
        # 啟動同步線程
        threading.Thread(
            target=self.sync_worker,
            args=(urls, apply_additional_discount),
            daemon=True
        ).start()

    def sync_worker(self, urls, apply_additional_discount):
        """同步處理線程"""
        total = len(urls)
        completed = 0
        success_count = 0
        fail_count = 0
        failed_urls = []
        
        
        try:
            for url in urls:
                try:
                    # 更新進度
                    completed += 1
                    progress_pct = (completed / total) * 100
                    
                    # 同步折扣
                    self.log(f"處理 [{completed}/{total}] {url}")
                    result = self.syncer.sync_discount(url, apply_additional_discount)
                    
                    # 儲存結果
                    self.sync_results.append(result)
                    
                    # 更新日誌
                    if result['success']:
                        success_count += 1
                        freak_discount = result['freak_discount']
                        easy_discount = result['easy_discount']
                        original_price = result.get('original_price', 0)
                        final_price = result.get('final_price', 0)
                        updated_variants_count = result.get('updated_variants_count', 1)
                        
                        additional_info = ""
                        if result.get('additional_discount_applied'):
                            additional_info = f" + 高價商品額外15%折扣，最終價格: {final_price}"
                            
                        self.log(f"[成功] {result['sku']} → {result['easy_sku']} - Freak折扣: {freak_discount}% → Easy折扣: {easy_discount}%，原價: {original_price} → 新價格: {final_price}{additional_info}")
                        self.log(f"   -- 已更新該商品的 {updated_variants_count} 個變體")
                    else:
                        fail_count += 1
                        self.log(f"[失敗] {url} - {result.get('error', '未知錯誤')}")
                        
                    # 更新進度條
                    self.progress_var.set(completed)
                    
                except Exception as e:
                    fail_count += 1
                    self.log(f"[錯誤] 處理 {url} 時發生異常: {e}")
            # 完成处理后，如果有失败的URL，额外显示一个总结
            if failed_urls:
                self.log("====== 同步失敗商品列表 ======")
                for i, failed_url in enumerate(failed_urls):
                    self.log(f"失敗 {i+1}: {failed_url}")
                self.log("=============================")
                    
                    
        except Exception as e:
            self.log(f"[嚴重錯誤] 同步過程中斷: {e}")
        finally:
            # 完成處理
            self.log(f"同步完成! 共處理 {total} 個URL")
            
            # 使用更安全的方式在主線程顯示訊息框
            self.root.after(0, lambda: messagebox.showinfo("完成", f"所有商品折扣同步已結束！\n成功: {success_count}\n失敗: {fail_count}"))
            
            # 恢復按鈕
            self.root.after(0, self.enable_buttons)

    def disable_buttons(self):
        """禁用按鈕"""
        for widget in self.root.winfo_children():
            if isinstance(widget, ttk.Frame) or isinstance(widget, ttk.LabelFrame):
                for child in widget.winfo_children():
                    if isinstance(child, ttk.Button):
                        child.configure(state='disabled')
            elif isinstance(widget, ttk.Button):
                widget.configure(state='disabled')

    def enable_buttons(self):
        """啟用按鈕"""
        for widget in self.root.winfo_children():
            if isinstance(widget, ttk.Frame) or isinstance(widget, ttk.LabelFrame):
                for child in widget.winfo_children():
                    if isinstance(child, ttk.Button):
                        child.configure(state='normal')
            elif isinstance(widget, ttk.Button):
                widget.configure(state='normal')

    def export_results(self):
        """匯出同步結果"""
        if not self.sync_results:
            messagebox.showinfo("提示", "沒有同步結果可匯出")
            return
            
        filepath = filedialog.asksaveasfilename(
            title="匯出同步結果",
            defaultextension=".xlsx",
            filetypes=[("Excel檔案", "*.xlsx"), ("所有檔案", "*.*")],
            initialfile=f"折扣同步結果_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        )
        
        if filepath:
            try:
                # 準備匯出資料
                export_data = []
                for r in self.sync_results:
                    if r.get('success', False):
                        export_data.append({
                            '同步狀態': '成功',
                            'Freak SKU': r.get('sku', ''),
                            'Easy SKU': r.get('easy_sku', ''),
                            'URL': r.get('url', ''),
                            'Freak折扣%': r.get('freak_discount', ''),
                            'Easy折扣%': r.get('easy_discount', ''),
                            '原價': r.get('original_price', ''),
                            '折扣後價格': r.get('discounted_price', ''),
                            '是否高價商品': '是' if r.get('high_price', False) else '否',
                            '是否套用額外折扣': '是' if r.get('additional_discount_applied', False) else '否',
                            '最終價格': r.get('final_price', ''),
                            'Product ID': r.get('product_id', ''),
                            'Variant ID': r.get('variant_id', '')
                        })
                    else:
                        export_data.append({
                            '同步狀態': '失敗',
                            'URL': r.get('url', ''),
                            '錯誤訊息': r.get('error', '')
                        })
                
                # 轉換為DataFrame並匯出
                df = pd.DataFrame(export_data)
                df.to_excel(filepath, index=False)
                
                self.log(f"已匯出同步結果至 {os.path.basename(filepath)}")
                messagebox.showinfo("匯出成功", f"同步結果已匯出至:\n{filepath}")
            except Exception as e:
                self.log(f"匯出結果失敗: {e}")
                messagebox.showerror("匯出失敗", f"匯出結果時發生錯誤:\n{e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = DiscountSyncApp(root)
    root.mainloop()
