import re

html_file_path = 'landingpages/index.html'

with open(html_file_path, 'r') as f:
    html_content = f.read()

# Update about-image.jpg
html_content = html_content.replace('src="about-image.jpg"', 'src="images/optimized/about-image.jpg"')

# Update testimonial images
html_content = html_content.replace('src="jeremy-funderburk.jpg"', 'src="images/optimized/jeremy-funderburk.jpg"')
html_content = html_content.replace('src="bob-gors.jpg"', 'src="images/optimized/bob-gors.jpg"')
html_content = html_content.replace('src="gina-davila.jpg"', 'src="images/optimized/gina-davila.jpg"')

# Update contact-image.jpg
html_content = html_content.replace('<div class="contact-image">\n                <p>Image Placeholder</p>\n            </div>', '<div class="contact-image">\n                <img src="images/optimized/contact-image.png" alt="AI Marketing Contact Image">\n            </div>')

# Update logo in navigation
# The original was <a href="#" class="logo">AID Marketing</a>
# The new one should be <a href="#" class="logo"><img src="images/optimized/logo.png" alt="AID Marketing Logo" style="height: 40px;"></a>
html_content = html_content.replace('<a href="#" class="logo">AID Marketing</a>', '<a href="#" class="logo"><img src="images/optimized/logo.png" alt="AID Marketing Logo" style="height: 40px;"></a>')

with open(html_file_path, 'w') as f:
    f.write(html_content)

print("index.html updated successfully.")


