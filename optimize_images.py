from PIL import Image
import os

input_dir = 'landingpages/images'
output_dir = 'landingpages/images/optimized'
os.makedirs(output_dir, exist_ok=True)

def optimize_image(filepath, output_path, size=None, quality=85):
    try:
        with Image.open(filepath) as img:
            if size:
                img.thumbnail(size, Image.Resampling.LANCZOS)
            img.save(output_path, optimize=True, quality=quality)
            print(f'Optimized {filepath} to {output_path}')
    except Exception as e:
        print(f'Error optimizing {filepath}: {e}')

# Optimize about-image.jpg
optimize_image(os.path.join(input_dir, 'headshot_1457.jpg'), os.path.join(output_dir, 'about-image.jpg'), size=(1000, 1000))

# Optimize testimonial avatars
optimize_image(os.path.join(input_dir, 'headshot_1438.jpg'), os.path.join(output_dir, 'jeremy-funderburk.jpg'), size=(150, 150))
optimize_image(os.path.join(input_dir, 'headshot_1462.jpg'), os.path.join(output_dir, 'bob-gors.jpg'), size=(150, 150))
optimize_image(os.path.join(input_dir, 'headshot_1501.jpg'), os.path.join(output_dir, 'gina-davila.jpg'), size=(150, 150))

# Optimize contact section AI image
optimize_image(os.path.join(input_dir, 'contact_section_ai_image.png'), os.path.join(output_dir, 'contact-image.png'), quality=90)

# Optimize logo
optimize_image(os.path.join(input_dir, 'logo_headshot.jpeg'), os.path.join(output_dir, 'logo.png'), size=(200, 200))


