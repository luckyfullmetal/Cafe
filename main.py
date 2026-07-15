from flask import Flask, request, jsonify
from PIL import Image
import requests
import io

app = Flask(__name__)

def get_roblox_image_url(asset_id):
    # This API resolves a Decal or Image ID to its raw image CDN URL
    delivery_url = f"https://assetdelivery.roblox.com/v1/asset/?id={asset_id}"
    response = requests.get(delivery_url, allow_redirects=True)
    if response.status_code == 200 and "png" in response.headers.get("Content-Type", "").lower() or "jpeg" in response.headers.get("Content-Type", "").lower():
        return response.url
    # Fallback to direct asset location if redirected URL isn't found
    return response.url

@app.route("/convert", methods=["GET"])
def convert_image():
    asset_id = request.args.get("id")
    target_width = int(request.args.get("width", 64))
    target_height = int(request.args.get("height", 64))
    
    if not asset_id:
        return jsonify({"error": "Missing 'id' parameter"}), 400

    try:
        # 1. Resolve and download the raw image file from Roblox
        img_url = get_roblox_image_url(asset_id)
        img_response = requests.get(img_url)
        
        if img_response.status_code != 200:
            return jsonify({"error": "Failed to download image from Roblox"}), 500
            
        # 2. Open the image and resize it to your target OLED resolution
        img = Image.open(io.BytesIO(img_response.content))
        img = img.convert("RGB")
        img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
        
        # 3. Extract RGB pixel values
        pixels = []
        width, height = img.size
        for y in range(height):
            for x in range(width):
                r, g, b = img.getpixel((x, y))
                # Only include non-black pixels to optimize the payload size!
                if r > 12 or g > 12 or b > 12:
                    pixels.append([x + 1, y + 1, r, g, b]) # [X, Y, R, G, B]
                    
        return jsonify({
            "width": width,
            "height": height,
            "pixels": pixels
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
