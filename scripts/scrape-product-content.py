#!/usr/bin/env python3
"""
Scrape product content from nnaud.io and update database
Extracts: images, audio files, video links, descriptions, features, etc.
"""
import urllib.request
import urllib.parse
import json
import re
import sys
from html.parser import HTMLParser
from bs4 import BeautifulSoup
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import Json

# Load environment variables
load_dotenv('.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '').replace('https://', '').replace('.supabase.co', '')
DB_PASSWORD = os.getenv('SUPABASE_DB_PASSWORD', '')
DB_HOST = f"db.{SUPABASE_URL}.supabase.co"
DB_NAME = "postgres"
DB_USER = "postgres"

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        port=5432
    )

def scrape_product_page(slug):
    """Scrape all content from a product page"""
    url = f"https://nnaud.io/product/{slug}/"
    
    print(f"\n{'='*60}")
    print(f"Scraping: {slug}")
    print(f"URL: {url}")
    print(f"{'='*60}")
    
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        response = urllib.request.urlopen(req, timeout=30)
        html = response.read().decode('utf-8')
        soup = BeautifulSoup(html, 'html.parser')
        
        data = {
            'images': [],
            'audio_files': [],
            'video_links': [],
            'description': '',
            'short_description': '',
            'features': [],
            'specifications': {},
            'gallery_images': []
        }
        
        # Extract main product image
        main_image = soup.find('img', class_='wp-post-image') or soup.find('img', {'data-src': re.compile('product')})
        if main_image:
            img_src = main_image.get('src') or main_image.get('data-src') or main_image.get('data-lazy-src')
            if img_src:
                if not img_src.startswith('http'):
                    img_src = urllib.parse.urljoin(url, img_src)
                data['images'].append(img_src)
                print(f"  ✓ Main image: {img_src}")
        
        # Extract all images from gallery
        gallery = soup.find('div', class_='woocommerce-product-gallery') or soup.find('div', class_='product-images')
        if gallery:
            for img in gallery.find_all('img'):
                img_src = img.get('src') or img.get('data-src') or img.get('data-lazy-src') or img.get('data-large_image')
                if img_src:
                    if not img_src.startswith('http'):
                        img_src = urllib.parse.urljoin(url, img_src)
                    if img_src not in data['gallery_images']:
                        data['gallery_images'].append(img_src)
                        print(f"  ✓ Gallery image: {img_src}")
        
        # Extract all images from content
        for img in soup.find_all('img'):
            img_src = img.get('src') or img.get('data-src') or img.get('data-lazy-src')
            if img_src and 'product' in img_src.lower():
                if not img_src.startswith('http'):
                    img_src = urllib.parse.urljoin(url, img_src)
                if img_src not in data['images'] and img_src not in data['gallery_images']:
                    data['images'].append(img_src)
        
        # Extract audio files
        for audio in soup.find_all('audio'):
            src = audio.get('src')
            if src:
                if not src.startswith('http'):
                    src = urllib.parse.urljoin(url, src)
                data['audio_files'].append(src)
                print(f"  ✓ Audio: {src}")
        
        for link in soup.find_all('a', href=re.compile(r'\.(mp3|wav|ogg|m4a)', re.I)):
            href = link.get('href')
            if href and href not in data['audio_files']:
                if not href.startswith('http'):
                    href = urllib.parse.urljoin(url, href)
                data['audio_files'].append(href)
                print(f"  ✓ Audio link: {href}")
        
        # Extract video links
        for video in soup.find_all('video'):
            src = video.get('src')
            if src:
                if not src.startswith('http'):
                    src = urllib.parse.urljoin(url, src)
                data['video_links'].append(src)
                print(f"  ✓ Video: {src}")
        
        for iframe in soup.find_all('iframe'):
            src = iframe.get('src')
            if src and ('youtube' in src or 'vimeo' in src or 'video' in src.lower()):
                data['video_links'].append(src)
                print(f"  ✓ Video iframe: {src}")
        
        # Extract description
        desc_div = soup.find('div', class_='woocommerce-product-details__short-description') or \
                   soup.find('div', class_='product-short-description') or \
                   soup.find('div', class_='entry-summary')
        if desc_div:
            data['short_description'] = desc_div.get_text(strip=True)[:500]
            print(f"  ✓ Short description: {len(data['short_description'])} chars")
        
        # Extract full description
        desc_div = soup.find('div', class_='woocommerce-product-details__description') or \
                   soup.find('div', class_='product-description') or \
                   soup.find('div', class_='entry-content')
        if desc_div:
            # Get text but preserve some formatting
            paragraphs = desc_div.find_all('p')
            data['description'] = '\n\n'.join([p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True)])
            print(f"  ✓ Description: {len(data['description'])} chars")
        
        # Extract features (usually in lists)
        features_list = soup.find('ul', class_='product-features') or \
                       soup.find('ul', class_='features') or \
                       soup.find('div', class_='product-features')
        if features_list:
            for li in features_list.find_all('li'):
                feature_text = li.get_text(strip=True)
                if feature_text and feature_text not in data['features']:
                    data['features'].append(feature_text)
                    print(f"  ✓ Feature: {feature_text[:50]}")
        
        # Look for features in description
        if data['description']:
            # Look for bullet points or numbered lists
            lines = data['description'].split('\n')
            for line in lines:
                if line.strip().startswith(('•', '-', '*', '✓', '→')) or re.match(r'^\d+[\.\)]', line.strip()):
                    feature = re.sub(r'^[•\-\*\✓→\d\.\)\s]+', '', line.strip())
                    if feature and len(feature) > 10 and feature not in data['features']:
                        data['features'].append(feature)
        
        print(f"\n  Summary:")
        print(f"    Images: {len(data['images']) + len(data['gallery_images'])}")
        print(f"    Audio files: {len(data['audio_files'])}")
        print(f"    Video links: {len(data['video_links'])}")
        print(f"    Features: {len(data['features'])}")
        
        return data
        
    except Exception as e:
        print(f"  ✗ Error scraping {slug}: {e}")
        return None

def update_product_in_db(product_id, data):
    """Update product in database with scraped data"""
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        
        # Prepare update query
        updates = []
        params = []
        
        if data.get('description'):
            updates.append("description = %s")
            params.append(data['description'])
        
        if data.get('short_description'):
            updates.append("short_description = %s")
            params.append(data['short_description'])
        
        if data.get('gallery_images'):
            updates.append("gallery_images = %s")
            params.append(Json(data['gallery_images']))
        
        if data.get('audio_samples'):
            updates.append("audio_samples = %s")
            params.append(Json(data['audio_samples']))
        
        if data.get('demo_video_url'):
            updates.append("demo_video_url = %s")
            params.append(data['demo_video_url'])
        
        if data.get('features'):
            updates.append("features = %s")
            params.append(Json(data['features']))
        
        if updates:
            params.append(product_id)
            query = f"""
                UPDATE products 
                SET {', '.join(updates)}, updated_at = NOW()
                WHERE id = %s
            """
            cur.execute(query, params)
            conn.commit()
            print(f"  ✓ Updated product in database")
            return True
        else:
            print(f"  ⚠ No data to update")
            return False
            
    except Exception as e:
        print(f"  ✗ Error updating database: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def main():
    if len(sys.argv) < 2:
        print("Usage: python scrape-product-content.py <slug>")
        print("Example: python scrape-product-content.py 20-for-20-midi-bundle-1")
        sys.exit(1)
    
    slug = sys.argv[1]
    
    # Get product ID from database
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM products WHERE slug = %s", (slug,))
        result = cur.fetchone()
        if not result:
            print(f"✗ Product with slug '{slug}' not found in database")
            sys.exit(1)
        product_id = result[0]
    finally:
        conn.close()
    
    # Scrape product page
    data = scrape_product_page(slug)
    
    if not data:
        print("✗ Failed to scrape product page")
        sys.exit(1)
    
    # Process data for database
    db_data = {}
    
    if data.get('description'):
        db_data['description'] = data['description']
    
    if data.get('short_description'):
        db_data['short_description'] = data['short_description']
    
    if data.get('gallery_images'):
        db_data['gallery_images'] = data['gallery_images']
    
    if data.get('audio_files'):
        db_data['audio_samples'] = [{'url': url, 'name': url.split('/')[-1]} for url in data['audio_files']]
    
    if data.get('video_links'):
        # Use first video as demo video
        db_data['demo_video_url'] = data['video_links'][0]
    
    if data.get('features'):
        db_data['features'] = data['features']
    
    # Update database
    update_product_in_db(product_id, db_data)
    
    print(f"\n✅ Complete!")

if __name__ == '__main__':
    main()
