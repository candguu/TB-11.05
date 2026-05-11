from PIL import Image, ImageChops

def crop_image(input_path, output_path):
    img = Image.open(input_path).convert('RGBA')
    bg = Image.new('RGBA', img.size, (255, 255, 255, 0))
    diff = ImageChops.difference(img, bg)
    bbox = diff.getbbox()
    if bbox:
        img = img.crop(bbox)
        img.save(output_path)
        print("Cropped successfully to:", bbox)
    else:
        print("No bounding box found (image might be empty or pure transparent).")
        img.save(output_path)

if __name__ == '__main__':
    crop_image('c:/Users/ahmet/OneDrive/Masaüstü/TB-18.03.2026/static/logo/yeni_logo.png', 'c:/Users/ahmet/OneDrive/Masaüstü/TB-18.03.2026/static/logo/yeni_logo_cropped.png')
