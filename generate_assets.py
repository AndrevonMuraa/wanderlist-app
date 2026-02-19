"""
WanderList App Icon & Splash Screen Generator
Design: Globe Lines (Design 1) + Decorative Splash (Splash 2)
Colors: Ocean to Sand (#4DB8D8 → #E8DCC8) + Gold accent (#C9A961)
"""

from PIL import Image, ImageDraw, ImageFont
import math
import os

# ============================================
# COLOR PALETTE (from theme.ts)
# ============================================
TURQUOISE = (77, 184, 216)       # #4DB8D8 - Primary
TURQUOISE_LIGHT = (125, 203, 227) # #7DCBE3 - Light
SAND = (232, 220, 200)           # #E8DCC8 - Secondary  
SAND_MID = (201, 202, 174)       # #C9CAAE - Mid transition
GOLD = (201, 169, 97)            # #C9A961 - Accent
WHITE = (255, 255, 255)

def create_gradient(width, height, color1, color2, direction='diagonal'):
    """Create a gradient image"""
    img = Image.new('RGBA', (width, height))
    
    for y in range(height):
        for x in range(width):
            if direction == 'diagonal':
                # Diagonal gradient
                factor = (x + y) / (width + height)
            elif direction == 'vertical':
                factor = y / height
            else:  # horizontal
                factor = x / width
            
            r = int(color1[0] + (color2[0] - color1[0]) * factor)
            g = int(color1[1] + (color2[1] - color1[1]) * factor)
            b = int(color1[2] + (color2[2] - color1[2]) * factor)
            img.putpixel((x, y), (r, g, b, 255))
    
    return img

def create_multicolor_gradient(width, height, colors, direction='vertical'):
    """Create a gradient with multiple color stops"""
    img = Image.new('RGBA', (width, height))
    
    num_colors = len(colors)
    
    for y in range(height):
        for x in range(width):
            if direction == 'vertical':
                factor = y / height
            elif direction == 'diagonal':
                factor = (x + y) / (width + height)
            else:
                factor = x / width
            
            # Find which two colors we're between
            scaled = factor * (num_colors - 1)
            idx1 = int(scaled)
            idx2 = min(idx1 + 1, num_colors - 1)
            local_factor = scaled - idx1
            
            c1 = colors[idx1]
            c2 = colors[idx2]
            
            r = int(c1[0] + (c2[0] - c1[0]) * local_factor)
            g = int(c1[1] + (c2[1] - c1[1]) * local_factor)
            b = int(c1[2] + (c2[2] - c1[2]) * local_factor)
            img.putpixel((x, y), (r, g, b, 255))
    
    return img

def draw_rounded_rect(draw, xy, radius, fill):
    """Draw a rounded rectangle"""
    x1, y1, x2, y2 = xy
    draw.rectangle([x1 + radius, y1, x2 - radius, y2], fill=fill)
    draw.rectangle([x1, y1 + radius, x2, y2 - radius], fill=fill)
    draw.pieslice([x1, y1, x1 + radius * 2, y1 + radius * 2], 180, 270, fill=fill)
    draw.pieslice([x2 - radius * 2, y1, x2, y1 + radius * 2], 270, 360, fill=fill)
    draw.pieslice([x1, y2 - radius * 2, x1 + radius * 2, y2], 90, 180, fill=fill)
    draw.pieslice([x2 - radius * 2, y2 - radius * 2, x2, y2], 0, 90, fill=fill)

def draw_globe_with_lines(draw, center_x, center_y, radius, border_width, fill_color=None):
    """Draw a globe with latitude/longitude lines"""
    
    # Draw filled circle if fill_color provided
    if fill_color:
        draw.ellipse([
            center_x - radius, center_y - radius,
            center_x + radius, center_y + radius
        ], fill=fill_color)
    
    # Draw main circle border
    draw.ellipse([
        center_x - radius, center_y - radius,
        center_x + radius, center_y + radius
    ], outline=WHITE, width=border_width)
    
    # Draw equator line
    equator_color = (255, 255, 255, 180)
    draw.line([
        center_x - radius + border_width, center_y,
        center_x + radius - border_width, center_y
    ], fill=WHITE, width=max(2, border_width // 3))
    
    # Draw meridian (vertical ellipse)
    meridian_width = radius * 0.5
    draw.ellipse([
        center_x - meridian_width, center_y - radius + border_width,
        center_x + meridian_width, center_y + radius - border_width
    ], outline=(255, 255, 255, 150), width=max(2, border_width // 4))
    
    # Draw latitude lines (top and bottom)
    lat_offset = radius * 0.35
    lat_width = radius * 0.75
    line_width = max(2, border_width // 4)
    
    # Top latitude
    draw.line([
        center_x - lat_width, center_y - lat_offset,
        center_x + lat_width, center_y - lat_offset
    ], fill=(255, 255, 255, 120), width=line_width)
    
    # Bottom latitude
    draw.line([
        center_x - lat_width, center_y + lat_offset,
        center_x + lat_width, center_y + lat_offset
    ], fill=(255, 255, 255, 120), width=line_width)

def draw_location_pin(draw, x, y, size, color):
    """Draw a location pin marker"""
    # Pin body (teardrop shape rotated)
    pin_radius = size * 0.4
    
    # Draw the pin as a circle + triangle
    # Main circle
    draw.ellipse([
        x - pin_radius, y - pin_radius,
        x + pin_radius, y + pin_radius
    ], fill=color, outline=WHITE, width=max(2, int(size * 0.12)))
    
    # Triangle point (bottom-left of the pin)
    point_x = x - size * 0.35
    point_y = y + size * 0.35
    draw.polygon([
        (x - pin_radius * 0.7, y + pin_radius * 0.3),
        (x - pin_radius * 0.3, y + pin_radius * 0.7),
        (point_x, point_y)
    ], fill=color)
    
    # Inner highlight dot
    dot_radius = pin_radius * 0.35
    draw.ellipse([
        x - dot_radius, y - dot_radius,
        x + dot_radius, y + dot_radius
    ], fill=WHITE)

def draw_w_letter(img, center_x, center_y, size, color=WHITE):
    """Draw a stylized W letter"""
    draw = ImageDraw.Draw(img)
    
    # Try to use a serif font, fallback to default
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", size)
    except:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf", size)
        except:
            font = ImageFont.load_default()
    
    # Get text bounding box
    bbox = draw.textbbox((0, 0), "W", font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center the text
    x = center_x - text_width // 2
    y = center_y - text_height // 2 - bbox[1]
    
    # Draw shadow
    draw.text((x + 2, y + 2), "W", fill=(0, 0, 0, 50), font=font)
    # Draw letter
    draw.text((x, y), "W", fill=color, font=font)

# ============================================
# GENERATE APP ICON (1024x1024)
# ============================================
def generate_app_icon():
    size = 1024
    
    # Create gradient background
    colors = [TURQUOISE, TURQUOISE_LIGHT, SAND_MID, SAND]
    img = create_multicolor_gradient(size, size, colors, 'diagonal')
    draw = ImageDraw.Draw(img)
    
    # Round the corners (for app icon)
    corner_radius = size * 0.22  # iOS-style rounded corners
    
    # Create mask for rounded corners
    mask = Image.new('L', (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    draw_rounded_rect(mask_draw, (0, 0, size, size), int(corner_radius), 255)
    
    # Apply mask
    img.putalpha(mask)
    
    # Draw the globe
    globe_radius = size * 0.32
    globe_center_x = size // 2
    globe_center_y = size // 2
    border_width = int(size * 0.025)
    
    draw_globe_with_lines(draw, globe_center_x, globe_center_y, globe_radius, border_width)
    
    # Draw W letter
    draw_w_letter(img, globe_center_x, globe_center_y, int(size * 0.35))
    
    # Draw location pin (top-right of globe)
    pin_x = globe_center_x + globe_radius * 0.65
    pin_y = globe_center_y - globe_radius * 0.65
    pin_size = size * 0.12
    draw_location_pin(draw, pin_x, pin_y, pin_size, GOLD)
    
    return img

# ============================================
# GENERATE SPLASH SCREEN (1284x2778 - iPhone 14 Pro Max)
# ============================================
def generate_splash_screen():
    width = 1284
    height = 2778
    
    # Create gradient background
    colors = [TURQUOISE, TURQUOISE_LIGHT, SAND_MID, SAND]
    img = create_multicolor_gradient(width, height, colors, 'vertical')
    draw = ImageDraw.Draw(img)
    
    # Draw decorative circles (background)
    circle_color = (255, 255, 255, 40)
    
    # Top-right circle
    circle1_x = width + 100
    circle1_y = -100
    circle1_radius = 400
    draw.ellipse([
        circle1_x - circle1_radius, circle1_y - circle1_radius,
        circle1_x + circle1_radius, circle1_y + circle1_radius
    ], outline=(255, 255, 255, 50), width=6)
    
    # Bottom-left circle
    circle2_x = -150
    circle2_y = height + 150
    circle2_radius = 500
    draw.ellipse([
        circle2_x - circle2_radius, circle2_y - circle2_radius,
        circle2_x + circle2_radius, circle2_y + circle2_radius
    ], outline=(255, 255, 255, 35), width=6)
    
    # Draw white icon container
    container_size = 340
    container_x = (width - container_size) // 2
    container_y = height // 2 - container_size - 80
    container_radius = 80
    
    # Container shadow
    shadow_offset = 20
    draw_rounded_rect(draw, 
        (container_x + shadow_offset, container_y + shadow_offset, 
         container_x + container_size + shadow_offset, container_y + container_size + shadow_offset),
        container_radius, (0, 0, 0, 30))
    
    # White container
    draw_rounded_rect(draw, 
        (container_x, container_y, container_x + container_size, container_y + container_size),
        container_radius, WHITE)
    
    # Draw globe inside container (turquoise filled)
    globe_center_x = width // 2
    globe_center_y = container_y + container_size // 2
    globe_radius = container_size * 0.35
    
    # Filled turquoise globe
    draw.ellipse([
        globe_center_x - globe_radius, globe_center_y - globe_radius,
        globe_center_x + globe_radius, globe_center_y + globe_radius
    ], fill=TURQUOISE)
    
    # Globe lines
    border_width = 0
    # Equator
    draw.line([
        globe_center_x - globe_radius + 5, globe_center_y,
        globe_center_x + globe_radius - 5, globe_center_y
    ], fill=(255, 255, 255, 180), width=4)
    
    # Meridian
    meridian_width = globe_radius * 0.5
    draw.ellipse([
        globe_center_x - meridian_width, globe_center_y - globe_radius + 5,
        globe_center_x + meridian_width, globe_center_y + globe_radius - 5
    ], outline=(255, 255, 255, 150), width=3)
    
    # Latitude lines
    lat_offset = globe_radius * 0.35
    lat_width = globe_radius * 0.7
    draw.line([
        globe_center_x - lat_width, globe_center_y - lat_offset,
        globe_center_x + lat_width, globe_center_y - lat_offset
    ], fill=(255, 255, 255, 120), width=3)
    draw.line([
        globe_center_x - lat_width, globe_center_y + lat_offset,
        globe_center_x + lat_width, globe_center_y + lat_offset
    ], fill=(255, 255, 255, 120), width=3)
    
    # Draw W letter on globe
    draw_w_letter(img, globe_center_x, globe_center_y, int(globe_radius * 0.9))
    
    # Draw location pin
    pin_x = globe_center_x + globe_radius * 0.7
    pin_y = globe_center_y - globe_radius * 0.7
    pin_size = 65
    draw_location_pin(draw, pin_x, pin_y, pin_size, GOLD)
    
    # Draw app name "WanderList"
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 100)
        tagline_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
    except:
        title_font = ImageFont.load_default()
        tagline_font = ImageFont.load_default()
    
    title = "WanderList"
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    title_y = container_y + container_size + 80
    
    # Shadow
    draw.text((title_x + 3, title_y + 3), title, fill=(0, 0, 0, 30), font=title_font)
    draw.text((title_x, title_y), title, fill=WHITE, font=title_font)
    
    # Tagline
    tagline = "Explore iconic landmarks"
    tagline_bbox = draw.textbbox((0, 0), tagline, font=tagline_font)
    tagline_width = tagline_bbox[2] - tagline_bbox[0]
    tagline_x = (width - tagline_width) // 2
    tagline_y = title_y + 120
    draw.text((tagline_x, tagline_y), tagline, fill=(255, 255, 255, 230), font=tagline_font)
    
    return img

# ============================================
# MAIN - Generate and save all assets
# ============================================
if __name__ == "__main__":
    output_dir = "/app/frontend/assets/images"
    
    print("🎨 Generating WanderList app assets...")
    
    # Generate app icon
    print("  → Creating app icon (1024x1024)...")
    icon = generate_app_icon()
    icon_path = os.path.join(output_dir, "icon.png")
    # Convert RGBA to RGB for icon (remove transparency for app store)
    icon_rgb = Image.new('RGB', icon.size, (255, 255, 255))
    icon_rgb.paste(icon, mask=icon.split()[3] if len(icon.split()) > 3 else None)
    icon_rgb.save(icon_path, "PNG", quality=95)
    print(f"  ✓ Saved: {icon_path}")
    
    # Generate splash screen
    print("  → Creating splash screen (1284x2778)...")
    splash = generate_splash_screen()
    splash_path = os.path.join(output_dir, "splash-image.png")
    splash.save(splash_path, "PNG", quality=95)
    print(f"  ✓ Saved: {splash_path}")
    
    # Also save adaptive icon for Android
    print("  → Creating adaptive icon foreground...")
    adaptive_icon = generate_app_icon()
    adaptive_path = os.path.join(output_dir, "adaptive-icon.png")
    adaptive_icon.save(adaptive_path, "PNG", quality=95)
    print(f"  ✓ Saved: {adaptive_path}")
    
    print("\n✅ All assets generated successfully!")
    print(f"\nFiles created in {output_dir}:")
    print("  • icon.png (1024x1024) - App icon")
    print("  • splash-image.png (1284x2778) - Splash screen")
    print("  • adaptive-icon.png (1024x1024) - Android adaptive icon")
