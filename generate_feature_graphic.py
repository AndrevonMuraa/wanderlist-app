#!/usr/bin/env python3
"""
Generate WanderList Feature Graphic (1024x500px) for Google Play Store
Uses Pillow to create a professional promotional banner
"""

from PIL import Image, ImageDraw, ImageFont
import math
import os

# Dimensions
WIDTH = 1024
HEIGHT = 500

def create_gradient(width, height, colors):
    """Create a horizontal gradient image"""
    img = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(img)
    
    for x in range(width):
        # Calculate position ratio
        ratio = x / width
        
        # Determine which color pair we're between
        num_colors = len(colors)
        segment = ratio * (num_colors - 1)
        idx = int(segment)
        local_ratio = segment - idx
        
        if idx >= num_colors - 1:
            idx = num_colors - 2
            local_ratio = 1.0
        
        # Interpolate between colors
        r = int(colors[idx][0] + (colors[idx+1][0] - colors[idx][0]) * local_ratio)
        g = int(colors[idx][1] + (colors[idx+1][1] - colors[idx][1]) * local_ratio)
        b = int(colors[idx][2] + (colors[idx+1][2] - colors[idx][2]) * local_ratio)
        
        draw.line([(x, 0), (x, height)], fill=(r, g, b))
    
    return img

def draw_circle(draw, center, radius, fill, alpha=255):
    """Draw a filled circle"""
    x, y = center
    draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=fill)

def draw_globe(draw, center_x, center_y, radius, line_color):
    """Draw a globe with latitude/longitude lines"""
    # Outer circle
    draw.ellipse([center_x - radius, center_y - radius, 
                  center_x + radius, center_y + radius], 
                  outline=line_color, width=4)
    
    # Horizontal line (equator)
    draw.line([(center_x - radius, center_y), (center_x + radius, center_y)], 
              fill=line_color, width=3)
    
    # Vertical line (prime meridian)
    draw.line([(center_x, center_y - radius), (center_x, center_y + radius)], 
              fill=line_color, width=3)
    
    # Additional latitude lines
    for offset in [0.4]:
        y_offset = int(radius * offset)
        # Top latitude
        draw.line([(center_x - int(radius * 0.9), center_y - y_offset), 
                   (center_x + int(radius * 0.9), center_y - y_offset)], 
                   fill=line_color, width=2)
        # Bottom latitude
        draw.line([(center_x - int(radius * 0.9), center_y + y_offset), 
                   (center_x + int(radius * 0.9), center_y + y_offset)], 
                   fill=line_color, width=2)

def draw_location_pin(draw, center_x, center_y, size, fill_color):
    """Draw a location pin"""
    # Main pin body (circle + triangle)
    pin_radius = size // 2
    
    # Draw the circular part
    draw.ellipse([center_x - pin_radius, center_y - pin_radius,
                  center_x + pin_radius, center_y + pin_radius], fill=fill_color)
    
    # Draw the point (triangle)
    points = [
        (center_x - pin_radius + 5, center_y + pin_radius // 2),
        (center_x + pin_radius - 5, center_y + pin_radius // 2),
        (center_x, center_y + size)
    ]
    draw.polygon(points, fill=fill_color)
    
    # Inner white circle
    inner_radius = size // 5
    draw.ellipse([center_x - inner_radius, center_y - inner_radius,
                  center_x + inner_radius, center_y + inner_radius], fill=(255, 255, 255))

def create_feature_graphic():
    """Create the feature graphic"""
    
    # Ocean to Sand gradient colors
    gradient_colors = [
        (77, 184, 216),   # #4DB8D8 - Turquoise
        (125, 203, 227),  # #7DCBE3 - Light turquoise
        (201, 202, 174),  # #C9CAAE - Transition
        (232, 220, 200),  # #E8DCC8 - Sand
    ]
    
    # Create base gradient
    img = create_gradient(WIDTH, HEIGHT, gradient_colors)
    draw = ImageDraw.Draw(img)
    
    # Add decorative circles (semi-transparent effect via lighter colors)
    # Top-left circle
    circle_color = (255, 255, 255)
    for i in range(50):
        alpha_factor = 1 - (i / 50)
        r = int(gradient_colors[0][0] + (255 - gradient_colors[0][0]) * alpha_factor * 0.15)
        g = int(gradient_colors[0][1] + (255 - gradient_colors[0][1]) * alpha_factor * 0.15)
        b = int(gradient_colors[0][2] + (255 - gradient_colors[0][2]) * alpha_factor * 0.15)
        draw_circle(draw, (-50 + i, -100 + i), 200 - i * 2, (r, g, b))
    
    # Bottom-right circle
    for i in range(40):
        alpha_factor = 1 - (i / 40)
        r = int(gradient_colors[3][0] + (255 - gradient_colors[3][0]) * alpha_factor * 0.15)
        g = int(gradient_colors[3][1] + (255 - gradient_colors[3][1]) * alpha_factor * 0.15)
        b = int(gradient_colors[3][2] + (255 - gradient_colors[3][2]) * alpha_factor * 0.15)
        draw_circle(draw, (WIDTH + 30 - i, HEIGHT + 50 - i), 150 - i * 2, (r, g, b))
    
    # Try to load custom fonts, fall back to default
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
    except:
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()
    
    # Text colors
    text_dark = (42, 42, 42)
    text_gray = (74, 74, 74)
    
    # Draw app name
    app_name = "WanderList"
    draw.text((80, 150), app_name, fill=text_dark, font=font_large)
    
    # Draw tagline
    tagline = "Explore the World, One Landmark at a Time"
    draw.text((80, 240), tagline, fill=text_gray, font=font_medium)
    
    # Draw feature pills
    pill_y = 320
    pill_height = 44
    pill_radius = 22
    pill_color = (255, 255, 255, 200)
    
    features = [
        ("🌍 560+ Landmarks", 80),
        ("🏆 48 Countries", 300),
        ("📸 Track Visits", 500),
    ]
    
    for text, x in features:
        # Pill background
        pill_width = 180
        draw.rounded_rectangle([x, pill_y, x + pill_width, pill_y + pill_height], 
                               radius=pill_radius, fill=(255, 255, 255))
        # Pill text
        draw.text((x + 20, pill_y + 10), text, fill=text_dark, font=font_small)
    
    # Draw app icon area (right side)
    icon_center_x = 880
    icon_center_y = 250
    icon_size = 160
    
    # Icon background (rounded square gradient effect)
    icon_colors = [(77, 184, 216), (125, 203, 227), (232, 220, 200)]
    for i in range(icon_size // 2, 0, -1):
        ratio = i / (icon_size // 2)
        r = int(icon_colors[0][0] * ratio + icon_colors[2][0] * (1 - ratio))
        g = int(icon_colors[0][1] * ratio + icon_colors[2][1] * (1 - ratio))
        b = int(icon_colors[0][2] * ratio + icon_colors[2][2] * (1 - ratio))
        draw.rounded_rectangle([icon_center_x - i, icon_center_y - i, 
                               icon_center_x + i, icon_center_y + i], 
                               radius=35, fill=(r, g, b))
    
    # Draw globe in icon
    globe_radius = 55
    draw_globe(draw, icon_center_x, icon_center_y, globe_radius, (255, 255, 255))
    
    # Draw W letter
    try:
        font_w = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 50)
    except:
        font_w = font_large
    
    w_text = "W"
    # Get text bounding box for centering
    bbox = draw.textbbox((0, 0), w_text, font=font_w)
    w_width = bbox[2] - bbox[0]
    w_height = bbox[3] - bbox[1]
    draw.text((icon_center_x - w_width // 2, icon_center_y - w_height // 2 - 5), 
              w_text, fill=(255, 255, 255), font=font_w)
    
    # Draw location pin
    pin_x = icon_center_x + 55
    pin_y = icon_center_y - 60
    draw_location_pin(draw, pin_x, pin_y, 30, (201, 169, 97))  # Gold color
    
    # Add subtle dot pattern overlay
    for x in range(0, WIDTH, 40):
        for y in range(0, HEIGHT, 40):
            draw.ellipse([x-1, y-1, x+1, y+1], fill=(255, 255, 255, 30))
    
    # Save the image
    output_path = "/app/frontend/assets/images/feature-graphic.png"
    img.save(output_path, "PNG", quality=95)
    print(f"✅ Feature graphic saved to: {output_path}")
    print(f"   Size: {WIDTH}x{HEIGHT}px")
    
    return output_path

if __name__ == "__main__":
    create_feature_graphic()
