import httpx
import os

def debug_header():
    # A known image URL from the product page (extracted manually or simulated)
    # I'll pick one that typically appears on the page.
    # From previous logs, I don't have exact image URLs.
    # I'll restart the browser fetch briefly to get a real image URL or just assume one pattern if possible.
    # Better: Use the browser to get the image URL first, then debug download it.
    
    # Or I can use a known pattern if I know it.
    # But daytona URLs are hashed.
    
    # I will perform a quick fetch-parse to get a real URL.
    from selenium_fetcher import fetch_html_from_url
    from html_parser import parse_html_to_data
    
    url = "https://www.daytona-park.com/item/3232375300006?color=33"
    print(f"Fetching HTML for {url}...")
    html = fetch_html_from_url(url)
    
    if not html:
        print("Failed to fetch HTML")
        return

    data = parse_html_to_data(html)
    images = data.get("images", [])
    
    if not images:
        print("No images found")
        return
        
    target_img = images[0]
    print(f"Target Image URL: {target_img}")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Referer": url,
        "sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "sec-fetch-dest": "image",
        "sec-fetch-mode": "no-cors",
        "sec-fetch-site": "same-site",
    }
    
    print("Attempting download with httpx HTTP/2...")
    try:
        with httpx.Client(http2=True, verify=False, follow_redirects=True) as client:
            resp = client.get(target_img, headers=headers)
            print(f"Status Code: {resp.status_code}")
            print(f"Content Length: {len(resp.content)}")
            
            # Print first 32 bytes in HEX
            header_bytes = resp.content[:32]
            print(f"Header HEX: {header_bytes.hex(' ')}")
            
            # Save for inspection
            with open("debug_image.jpg", "wb") as f:
                f.write(resp.content)
            print("Saved to debug_image.jpg")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_header()
