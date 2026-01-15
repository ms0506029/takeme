/**
 * ============================================================
 * BeamsFlexBuilder.gs
 * BEAMS 促銷系統 - Flex Message 建構器
 * ============================================================
 *
 * 版本：v1.0.0
 * 更新日期：2025-12-26
 */

const BeamsFlexBuilder = {
    
    // 品牌色彩
    COLORS: {
        PRIMARY: '#FF6B35',      // BEAMS 橘色
        SUCCESS: '#27AE60',      // 綠色（符合折扣）
        WARNING: '#F39C12',      // 黃色（提醒）
        DANGER: '#E74C3C',       // 紅色（不符合）
        TEXT_PRIMARY: '#333333',
        TEXT_SECONDARY: '#666666',
        TEXT_LIGHT: '#999999',
        BG_LIGHT: '#F5F5F5'
    },
    
    // ============================================================
    // 歡迎訊息
    // ============================================================
    
    /**
     * 建立 BEAMS 活動歡迎訊息
     */
    buildWelcomeMessage: function() {
        const remainingTime = BeamsSaleService.getCampaignRemainingTime();
        
        return {
            type: 'flex',
            altText: 'BEAMS 每半年一次超級折扣活動',
            contents: {
                type: 'bubble',
                size: 'mega',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: this.COLORS.PRIMARY,
                    paddingAll: '20px',
                    contents: [
                        {
                            type: 'text',
                            text: '🎉 BEAMS 會員限定',
                            color: '#FFFFFF',
                            size: 'lg',
                            weight: 'bold'
                        },
                        {
                            type: 'text',
                            text: '每半年一次的超級折扣活動',
                            color: '#FFFFFF',
                            size: 'lg',
                            weight: 'bold',
                            margin: 'sm',
                            wrap: true
                        },
                        {
                            type: 'text',
                            text: '多達八千多樣商品直接七折！',
                            color: '#FFE4D6',
                            size: 'md',
                            margin: 'sm',
                            wrap: true
                        },
                        {
                            type: 'text',
                            text: remainingTime,
                            color: '#FFE4D6',
                            size: 'sm',
                            margin: 'md'
                        }
                    ]
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    paddingAll: '20px',
                    contents: [
                        {
                            type: 'text',
                            text: '使用說明',
                            weight: 'bold',
                            size: 'md',
                            color: this.COLORS.TEXT_PRIMARY
                        },
                        {
                            type: 'text',
                            text: '1️⃣ 點選下方類別瀏覽商品',
                            size: 'sm',
                            color: this.COLORS.TEXT_SECONDARY,
                            margin: 'md',
                            wrap: true
                        },
                        {
                            type: 'text',
                            text: '2️⃣ 想確認是否為活動折扣商品，請複製該商品網址至對話框',
                            size: 'sm',
                            color: this.COLORS.TEXT_SECONDARY,
                            margin: 'sm',
                            wrap: true
                        },
                        {
                            type: 'text',
                            text: '3️⃣ 報價及購買方式： 將改商品網址輸入對話窗',
                            size: 'sm',
                            color: this.COLORS.TEXT_SECONDARY,
                            margin: 'sm',
                            wrap: true
                        }
                    ]
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'button',
                            action: {
                                type: 'postback',
                                label: '📂 瀏覽折扣範圍的商品類別',
                                data: 'action=beams_categories'
                            },
                            style: 'primary',
                            color: this.COLORS.PRIMARY
                        },
                        {
                            type: 'button',
                            action: {
                                type: 'uri',
                                label: '🌐 前往會員限定BEAMS專屬折扣頁面',
                                uri: 'https://www.beams.co.jp/brand/900000/'
                            },
                            style: 'secondary',
                            margin: 'sm'
                        }
                    ]
                }
            }
        };
    },

    
    // ============================================================
    // 類別選單
    // ============================================================
    
    /**
     * 建立類別選單 Carousel
     */
    buildCategoryCarousel: function() {
        const categories = BeamsSaleService.getCategoryList();
        
        // 分組（每 6 個一組）
        const groups = [];
        for (let i = 0; i < categories.length; i += 6) {
            groups.push(categories.slice(i, i + 6));
        }
        
        const bubbles = groups.map((group, index) => ({
            type: 'bubble',
            size: 'kilo',
            header: {
                type: 'box',
                layout: 'vertical',
                backgroundColor: this.COLORS.PRIMARY,
                paddingAll: '15px',
                contents: [
                    {
                        type: 'text',
                        text: `商品類別 (${index + 1}/${groups.length})`,
                        color: '#FFFFFF',
                        size: 'md',
                        weight: 'bold'
                    }
                ]
            },
            body: {
                type: 'box',
                layout: 'vertical',
                paddingAll: '15px',
                spacing: 'sm',
                contents: group.map(cat => ({
                    type: 'button',
                    action: {
                        type: 'uri',
                        label: cat.zh,
                        uri: cat.url
                    },
                    style: 'secondary',
                    height: 'sm'
                }))
            }
        }));
        
        return {
            type: 'flex',
            altText: 'BEAMS 商品類別',
            contents: {
                type: 'carousel',
                contents: bubbles
            }
        };
    },
    
    // ============================================================
    // 商品報價訊息
    // ============================================================
    
    /**
     * 建立商品報價 Flex Message
     * @param {Object} productInfo - 商品資訊
     */
    buildProductQuote: function(productInfo) {
        if (!productInfo.hasDiscount) {
            return this.buildNoDiscountMessage(productInfo);
        }
        
        return {
            type: 'flex',
            altText: `${productInfo.productName} 報價`,
            contents: {
                type: 'bubble',
                size: 'mega',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: this.COLORS.SUCCESS,
                    paddingAll: '20px',
                    contents: [
                        {
                            type: 'text',
                            text: '✅ 符合 30% OFF 活動',
                            color: '#FFFFFF',
                            size: 'lg',
                            weight: 'bold'
                        }
                    ]
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    paddingAll: '20px',
                    contents: [
                        {
                            type: 'text',
                            text: productInfo.productName,
                            weight: 'bold',
                            size: 'lg',
                            wrap: true,
                            color: this.COLORS.TEXT_PRIMARY
                        },
                        {
                            type: 'text',
                            text: productInfo.category || 'BEAMS',
                            size: 'sm',
                            color: this.COLORS.TEXT_LIGHT,
                            margin: 'sm'
                        },
                        {
                            type: 'separator',
                            margin: 'lg'
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            margin: 'lg',
                            contents: [
                                {
                                    type: 'text',
                                    text: '日幣原價',
                                    size: 'sm',
                                    color: this.COLORS.TEXT_SECONDARY,
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: `¥${productInfo.originalPrice.toLocaleString()}`,
                                    size: 'sm',
                                    color: this.COLORS.TEXT_SECONDARY,
                                    align: 'end'
                                }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            margin: 'sm',
                            contents: [
                                {
                                    type: 'text',
                                    text: '活動折扣',
                                    size: 'sm',
                                    color: this.COLORS.SUCCESS,
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: '30% OFF',
                                    size: 'sm',
                                    color: this.COLORS.SUCCESS,
                                    weight: 'bold',
                                    align: 'end'
                                }
                            ]
                        },
                        {
                            type: 'separator',
                            margin: 'lg'
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            margin: 'lg',
                            contents: [
                                {
                                    type: 'text',
                                    text: '台幣報價',
                                    size: 'lg',
                                    weight: 'bold',
                                    color: this.COLORS.TEXT_PRIMARY,
                                    flex: 1
                                },
                                {
                                    type: 'text',
                                    text: `NT$ ${productInfo.twdPrice.toLocaleString()}`,
                                    size: 'xl',
                                    weight: 'bold',
                                    color: this.COLORS.PRIMARY,
                                    align: 'end'
                                }
                            ]
                        },
                        {
                            type: 'text',
                            text: productInfo.fromCache ? '⚡ 快取秒回' : '🔄 即時查詢',
                            size: 'xs',
                            color: this.COLORS.TEXT_LIGHT,
                            margin: 'lg',
                            align: 'end'
                        }
                    ]
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'button',
                            action: {
                                type: 'postback',
                                label: '🛒 我要下單',
                                data: `action=beams_order&productId=${productInfo.productId}&price=${productInfo.originalPrice}`
                            },
                            style: 'primary',
                            color: this.COLORS.PRIMARY
                        },
                        {
                            type: 'button',
                            action: {
                                type: 'uri',
                                label: '🔗 查看商品',
                                uri: productInfo.url || `https://www.beams.co.jp/item/beams/item/${productInfo.productId}/`
                            },
                            style: 'secondary',
                            margin: 'sm'
                        }
                    ]
                }
            }
        };
    },
    
    /**
     * 建立不符合折扣訊息
     */
    buildNoDiscountMessage: function(productInfo) {
        return {
            type: 'flex',
            altText: '此商品不在活動範圍內',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: this.COLORS.DANGER,
                    paddingAll: '20px',
                    contents: [
                        {
                            type: 'text',
                            text: '❌ 不在活動範圍',
                            color: '#FFFFFF',
                            size: 'lg',
                            weight: 'bold'
                        }
                    ]
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    paddingAll: '20px',
                    contents: [
                        {
                            type: 'text',
                            text: productInfo.productName || '此商品',
                            weight: 'bold',
                            wrap: true
                        },
                        {
                            type: 'text',
                            text: '此商品不在 30% OFF 活動範圍內。\n如需報價，請聯繫客服。',
                            size: 'sm',
                            color: this.COLORS.TEXT_SECONDARY,
                            margin: 'md',
                            wrap: true
                        }
                    ]
                }
            }
        };
    },

    
    // ============================================================
    // 折扣商品確認訊息（用戶貼上 URL 後顯示）
    // ============================================================
    
    /**
     * 建立折扣商品確認 Flex Message
     * @param {string} productUrl - 商品網址
     * @param {string} productId - 商品 ID
     */
    buildDiscountProductConfirm: function(productUrl, productId) {
        return {
            type: 'flex',
            altText: '✅ 此商品為活動折扣範圍',
            contents: {
                type: 'bubble',
                size: 'kilo',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: this.COLORS.SUCCESS,
                    paddingAll: '15px',
                    contents: [
                        {
                            type: 'text',
                            text: '✅ 此商品為活動折扣範圍',
                            color: '#FFFFFF',
                            size: 'md',
                            weight: 'bold'
                        }
                    ]
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    paddingAll: '15px',
                    contents: [
                        {
                            type: 'text',
                            text: '這個商品符合 BEAMS 每半年一次的超級折扣活動，可享七折優惠！',
                            size: 'sm',
                            color: this.COLORS.TEXT_SECONDARY,
                            wrap: true
                        },
                        {
                            type: 'text',
                            text: '請選擇您想進行的動作：',
                            size: 'sm',
                            color: this.COLORS.TEXT_PRIMARY,
                            margin: 'lg',
                            weight: 'bold'
                        }
                    ]
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'button',
                            action: {
                                type: 'postback',
                                label: '💰 我想知道報價',
                                data: `action=beams_get_quote&url=${encodeURIComponent(productUrl)}&productId=${productId}`
                            },
                            style: 'primary',
                            color: this.COLORS.PRIMARY
                        },
                        {
                            type: 'button',
                            action: {
                                type: 'postback',
                                label: '🛒 我要購買此商品',
                                data: `action=beams_purchase&url=${encodeURIComponent(productUrl)}&productId=${productId}`
                            },
                            style: 'primary',
                            color: '#0055AA',
                            margin: 'md'
                        }
                    ]
                }
            }
        };

    },
    
    /**
     * 建立報價輸入提示（請用戶輸入日幣價格）
     * @param {string} productUrl - 商品網址
     */
    buildPriceInputPrompt: function(productUrl) {
        return {
            type: 'flex',
            altText: '請輸入商品日幣價格',
            contents: {
                type: 'bubble',
                body: {
                    type: 'box',
                    layout: 'vertical',
                    paddingAll: '20px',
                    contents: [
                        {
                            type: 'text',
                            text: '💴 請輸入商品日幣價格',
                            weight: 'bold',
                            size: 'lg',
                            color: this.COLORS.TEXT_PRIMARY
                        },
                        {
                            type: 'text',
                            text: '請在下方輸入日幣金額（只需輸入數字）',
                            size: 'sm',
                            color: this.COLORS.TEXT_SECONDARY,
                            margin: 'md',
                            wrap: true
                        },
                        {
                            type: 'text',
                            text: '範例：12100',
                            size: 'sm',
                            color: this.COLORS.TEXT_LIGHT,
                            margin: 'md'
                        }
                    ]
                }
            }
        };
    },
    
    /**
     * 建立購買引導訊息（請用戶提供規格）
     * @param {string} productUrl - 商品網址
     */
    buildPurchaseGuide: function(productUrl) {
        return {
            type: 'flex',
            altText: '請提供商品資訊',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: this.COLORS.PRIMARY,
                    paddingAll: '15px',
                    contents: [
                        {
                            type: 'text',
                            text: '🛒 購買商品',
                            color: '#FFFFFF',
                            size: 'lg',
                            weight: 'bold'
                        }
                    ]
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    paddingAll: '20px',
                    contents: [
                        {
                            type: 'text',
                            text: '請提供以下資訊：',
                            weight: 'bold',
                            size: 'md',
                            color: this.COLORS.TEXT_PRIMARY
                        },
                        {
                            type: 'text',
                            text: '1️⃣ 顏色',
                            size: 'sm',
                            color: this.COLORS.TEXT_SECONDARY,
                            margin: 'lg'
                        },
                        {
                            type: 'text',
                            text: '2️⃣ 尺寸',
                            size: 'sm',
                            color: this.COLORS.TEXT_SECONDARY,
                            margin: 'sm'
                        },
                        {
                            type: 'text',
                            text: '3️⃣ 數量',
                            size: 'sm',
                            color: this.COLORS.TEXT_SECONDARY,
                            margin: 'sm'
                        },
                        {
                            type: 'text',
                            text: '4️⃣ 商品頁面截圖',
                            size: 'sm',
                            color: this.COLORS.TEXT_SECONDARY,
                            margin: 'sm'
                        },
                        {
                            type: 'separator',
                            margin: 'lg'
                        },
                        {
                            type: 'text',
                            text: '📝 只需依格式回覆：\n顏色, 尺寸, 數量即可\n',
                            size: 'sm',
                            color: this.COLORS.TEXT_PRIMARY,
                            margin: 'lg',
                            wrap: true
                        },
                        {
                            type: 'text',
                            text: '範例：BLACK, L, 1（可以不用逗號，但必須照顏色尺寸數量的順序輸入）',
                            size: 'xs',
                            color: this.COLORS.TEXT_LIGHT,
                            margin: 'sm',
                            wrap: true
                        }

                    ]
                }
            }
        };
    },
    
    // ============================================================
    // 下單流程訊息
    // ============================================================
    
    /**
     * 建立規格輸入提示
     */
    buildSpecInputPrompt: function(productInfo) {
        return {
            type: 'flex',
            altText: '請提供商品規格',
            contents: {
                type: 'bubble',
                body: {
                    type: 'box',
                    layout: 'vertical',
                    paddingAll: '20px',
                    contents: [
                        {
                            type: 'text',
                            text: '📝 請提供商品規格',
                            weight: 'bold',
                            size: 'lg'
                        },
                        {
                            type: 'text',
                            text: productInfo.productName,
                            size: 'sm',
                            color: this.COLORS.TEXT_SECONDARY,
                            margin: 'sm',
                            wrap: true
                        },
                        {
                            type: 'separator',
                            margin: 'lg'
                        },
                        {
                            type: 'text',
                            text: '請依以下格式回覆：',
                            size: 'sm',
                            margin: 'lg'
                        },
                        {
                            type: 'text',
                            text: '顏色, 尺寸',
                            size: 'md',
                            weight: 'bold',
                            color: this.COLORS.PRIMARY,
                            margin: 'sm'
                        },
                        {
                            type: 'text',
                            text: '例如：BLACK, L',
                            size: 'xs',
                            color: this.COLORS.TEXT_LIGHT,
                            margin: 'sm'
                        }
                    ]
                }
            }
        };
    },
    
    /**
     * 建立訂單確認訊息
     */
    buildOrderConfirmation: function(orderId, orderData) {
        return {
            type: 'flex',
            altText: `訂單 ${orderId} 已建立`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: this.COLORS.SUCCESS,
                    paddingAll: '20px',
                    contents: [
                        {
                            type: 'text',
                            text: '✅ 訂單已建立',
                            color: '#FFFFFF',
                            size: 'lg',
                            weight: 'bold'
                        },
                        {
                            type: 'text',
                            text: orderId,
                            color: '#E8F5E9',
                            size: 'sm',
                            margin: 'sm'
                        }
                    ]
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    paddingAll: '20px',
                    contents: [
                        {
                            type: 'text',
                            text: orderData.productName,
                            weight: 'bold',
                            wrap: true
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            margin: 'md',
                            contents: [
                                { type: 'text', text: '顏色', size: 'sm', color: this.COLORS.TEXT_SECONDARY, flex: 1 },
                                { type: 'text', text: orderData.color, size: 'sm', align: 'end' }
                            ]
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            margin: 'sm',
                            contents: [
                                { type: 'text', text: '尺寸', size: 'sm', color: this.COLORS.TEXT_SECONDARY, flex: 1 },
                                { type: 'text', text: orderData.size, size: 'sm', align: 'end' }
                            ]
                        },
                        {
                            type: 'separator',
                            margin: 'lg'
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            margin: 'lg',
                            contents: [
                                { type: 'text', text: '報價', size: 'lg', weight: 'bold', flex: 1 },
                                { type: 'text', text: `NT$ ${orderData.twdPrice.toLocaleString()}`, size: 'lg', weight: 'bold', color: this.COLORS.PRIMARY, align: 'end' }
                            ]
                        },
                        {
                            type: 'text',
                            text: '我們已收到您的訂單，將盡快為您處理！',
                            size: 'sm',
                            color: this.COLORS.TEXT_SECONDARY,
                            margin: 'lg',
                            wrap: true
                        }
                    ]
                }
            }
        };
    },
    
    // ============================================================
    // 活動結束訊息
    // ============================================================
    
    /**
     * 建立活動結束訊息
     */
    buildCampaignEndedMessage: function() {
        return {
            type: 'text',
            text: '❌ BEAMS 會員限定 30% OFF 活動已於 2025/12/31 21:59 結束。\n\n如有其他需求，請聯繫客服。'
        };
    }
};
