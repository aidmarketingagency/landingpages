from PIL import Image
import os

image_dir = 'landingpages/images'
output_file = 'image_analysis.txt'

with open(output_file, 'w') as f:
    for filename in os.listdir(image_dir):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
            filepath = os.path.join(image_dir, filename)
            try:
                with Image.open(filepath) as img:
                    width, height = img.size
                    file_size = os.path.getsize(filepath)
                    f.write(f'File: {filename}, Dimensions: {width}x{height}, Size: {file_size / 1024:.2f} KB\n')
            except Exception as e:
                f.write(f'Error processing {filename}: {e}\n')


