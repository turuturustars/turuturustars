#!/bin/bash
# Image Optimization Script for turuturustars project
# Compresses all images in src/assets/ for better performance
#
# Prerequisites:
# - ImageMagick: brew install imagemagick (macOS) or choco install imagemagick (Windows)
# - FFmpeg: brew install ffmpeg (optional, for WebP conversion)
#
# Usage: bash optimize-images.sh
# Results saved to src/assets-optimized/ with original quality comparison

set -e  # Exit on error

ASSETS_DIR="src/assets"
OPTIMIZED_DIR="src/assets-optimized"
REPORT_FILE="IMAGE_OPTIMIZATION_REPORT.md"

echo "🖼️  Image Optimization Script"
echo "=============================="
echo ""

# Check if ImageMagick is installed
if ! command -v magick &> /dev/null && ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Please install it:"
    echo "   macOS: brew install imagemagick"
    echo "   Windows: choco install imagemagick (as Admin)"
    echo "   Linux: sudo apt install imagemagick"
    exit 1
fi

# Create optimized directory
mkdir -p "$OPTIMIZED_DIR"

echo "📊 Analyzing images in $ASSETS_DIR..."
echo ""

# Initialize report
cat > "$REPORT_FILE" << 'EOF'
# Image Optimization Report

## Summary
- Original total size: [calculating...]
- Optimized total size: [calculating...]
- Total savings: [calculating...]

## File-by-File Results

EOF

total_before=0
total_after=0

# Process JPEGs
echo "🔄 Optimizing JPEG files (quality 75)..."
for jpg_file in "$ASSETS_DIR"/*.jpg; do
    [ -f "$jpg_file" ] || continue
    
    filename=$(basename "$jpg_file")
    output_file="$OPTIMIZED_DIR/$filename"
    
    # Get file size before
    before_size=$(stat -f%z "$jpg_file" 2>/dev/null || stat -c%s "$jpg_file" 2>/dev/null)
    
    # Optimize JPEG
    if command -v magick &> /dev/null; then
        magick convert "$jpg_file" -quality 75 -strip "$output_file"
    else
        convert "$jpg_file" -quality 75 -strip "$output_file"
    fi
    
    # Get file size after
    after_size=$(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null)
    
    # Calculate savings
    savings=$((before_size - after_size))
    percent=$((savings * 100 / before_size))
    
    # Convert to KB for readability
    before_kb=$((before_size / 1024))
    after_kb=$((after_size / 1024))
    
    echo "✅ $filename: ${before_kb}KB → ${after_kb}KB (-${percent}%)"
    
    total_before=$((total_before + before_size))
    total_after=$((total_after + after_size))
done

# Process PNGs
echo ""
echo "🔄 Optimizing PNG files (quality 95)..."
for png_file in "$ASSETS_DIR"/*.png; do
    [ -f "$png_file" ] || continue
    
    filename=$(basename "$png_file")
    output_file="$OPTIMIZED_DIR/$filename"
    
    # Get file size before
    before_size=$(stat -f%z "$png_file" 2>/dev/null || stat -c%s "$png_file" 2>/dev/null)
    
    # Optimize PNG
    if command -v magick &> /dev/null; then
        magick convert "$png_file" -quality 95 -strip "$output_file"
    else
        convert "$png_file" -quality 95 -strip "$output_file"
    fi
    
    # Get file size after
    after_size=$(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null)
    
    # Calculate savings
    savings=$((before_size - after_size))
    percent=$((savings * 100 / before_size))
    
    # Convert to KB for readability
    before_kb=$((before_size / 1024))
    after_kb=$((after_size / 1024))
    
    echo "✅ $filename: ${before_kb}KB → ${after_kb}KB (-${percent}%)"
    
    total_before=$((total_before + before_size))
    total_after=$((total_after + after_size))
done

# Calculate total savings
total_savings=$((total_before - total_after))
total_percent=$((total_savings * 100 / total_before))
total_before_mb=$((total_before / 1024 / 1024))
total_after_mb=$((total_after / 1024 / 1024))

echo ""
echo "📈 Results:"
echo "==========="
echo "Total before: ${total_before_mb}MB"
echo "Total after:  ${total_after_mb}MB"
echo "Total saved:  $((total_savings / 1024))KB (-${total_percent}%)"
echo ""
echo "✨ Optimized images saved to: $OPTIMIZED_DIR"
echo ""

# Generate detailed report
cat >> "$REPORT_FILE" << EOF

## Overall Results
- Original total size: ${total_before_mb}MB (${total_before} bytes)
- Optimized total size: ${total_after_mb}MB (${total_after} bytes)
- **Total savings: $((total_savings / 1024))KB (-${total_percent}%)**

## Optimization Settings
- JPEG quality: 75% (imperceptible loss, professional quality)
- PNG quality: 95% (minimal lossless optimization)
- Metadata: Stripped (removes EXIF, ICC profiles)

## Next Steps
1. Review optimized images visually for quality
2. Copy optimized images back to src/assets/: cp -r $OPTIMIZED_DIR/* src/assets/
3. Run: npm run build
4. Check dist/assets/img/ for further size reduction
5. Commit changes and deploy

## Recommendations
- Convert JPEGs to WebP for 25-35% additional savings
- Use responsive images with srcset for mobile optimization
- Install vite-plugin-imagemin for automatic compression on build
EOF

echo "📄 Detailed report saved to: $REPORT_FILE"
echo ""
echo "🎉 Optimization complete!"
