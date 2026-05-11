import ebayService from './ebayService.js';
import { legacyEbayListingId } from '../utils/dealOutboundUrl.js';

/** Map Browse API category text onto our seeded categories row. */
function resolveCategoryId(prepare, ebayCategoryName) {
  const n = (ebayCategoryName || '').toLowerCase();
  const hints = [
    ['watch', 'Watches'],
    ['handbag', 'Handbags'],
    ['bag', 'Handbags'],
    ['purse', 'Handbags'],
    ['wallet', 'Handbags'],
    ['jewelry', 'Jewelry'],
    ['jewellery', 'Jewelry'],
    ['diamond', 'Jewelry'],
    ['necklace', 'Jewelry'],
    ['earring', 'Jewelry'],
    ['bracelet', 'Jewelry'],
    ['sunglass', 'Sunglasses'],
    ['eyewear', 'Sunglasses'],
    ['belt', 'Accessories'],
    ['scarf', 'Accessories'],
    ['tie', 'Accessories']
  ];
  for (const [hint, catName] of hints) {
    if (n.includes(hint)) {
      const row = prepare('SELECT id FROM categories WHERE name = ?').get(catName);
      if (row) return row.id;
    }
  }
  return null;
}

/** Placeholder listings with search URLs — only used when Browse API unavailable. */
function insertSyntheticDealRows(db, prepare, campaignId, count) {
  const brands = {
    Watches: ['Rolex', 'Omega', 'TAG Heuer', 'Breitling', 'Cartier', 'Longines'],
    Handbags: ['Louis Vuitton', 'Gucci', 'Chanel', 'Hermès', 'Prada', 'Dior'],
    Jewelry: ['Cartier', 'Tiffany', 'Bvlgari', 'Chopard'],
    Sunglasses: ['Ray-Ban', 'Prada', 'Gucci', 'Oakley'],
    Accessories: ['Hermès', 'Gucci', 'Montblanc']
  };

  const products = {
    Watches: ['Submariner', 'Speedmaster', 'Carrera', 'Datejust', 'Seamaster'],
    Handbags: ['Neverfull', 'Speedy', 'Marmont', 'Birkin', 'Kelly'],
    Jewelry: ['Love Bracelet', 'Tennis Bracelet', 'Pearl Necklace'],
    Sunglasses: ['Aviator', 'Wayfarer', 'Polarized'],
    Accessories: ['Belt', 'Wallet', 'Scarf']
  };

  const images = {
    Watches: ['photo-1587836374828-4dbafa94cf0e', 'photo-1523275335684-37898b6baf30'],
    Handbags: ['photo-1584917865442-de89df76afd3', 'photo-1548036328-c9fa89d128fa'],
    Jewelry: ['photo-1515562141207-7a88fb7ce338'],
    Sunglasses: ['photo-1572635196237-14b3f281503f'],
    Accessories: ['photo-1601924994987-69e26d50dc26']
  };

  const categories = Object.keys(brands);
  let added = 0;

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const brandList = brands[category];
    const productList = products[category];
    const imageList = images[category];

    const brand = brandList[Math.floor(Math.random() * brandList.length)];
    const product = productList[Math.floor(Math.random() * productList.length)];
    const image = imageList[Math.floor(Math.random() * imageList.length)];

    const title = `${brand} ${product} ${['Premium', 'Luxury', 'Classic'][Math.floor(Math.random() * 3)]}`;
    const originalPrice = Math.floor(Math.random() * 9000) + 500;
    const discount = Math.floor(Math.random() * 15) + 30;
    const currentPrice = Math.floor(originalPrice * (1 - discount / 100));

    const cat = prepare('SELECT id FROM categories WHERE name = ?').get(category);
    const categoryId = cat ? cat.id : null;
    const ebayItemId = `sample-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 9)}`;

    const searchQuery = encodeURIComponent(`${brand} ${product}`);
    const ebayUrl =
      `https://www.ebay.com/sch/i.html?_nkw=${searchQuery}&_sacat=0&LH_BIN=1` +
      `&mkcid=1&mkrid=711-53200-19255-0&siteid=0&campid=${campaignId}&toolid=10001&mkevt=1`;
    const imageUrl = `https://images.unsplash.com/${image}?w=400`;

    db.run(
      'INSERT INTO deals (ebay_item_id, title, image_url, original_price, current_price, discount_percent, currency, condition, ebay_url, category_id, is_active, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ebayItemId, title, imageUrl, originalPrice, currentPrice, discount, 'USD', 'New', ebayUrl, categoryId, 1, 'ebay']
    );
    added++;
  }

  return added;
}

async function seedFromListingPoolOrSynthetic({ prepare, getDb, saveDatabase, maxRows }) {
  const campaignId = process.env.EBAY_CAMPAIGN_ID || '5339122678';

  let listingPool = [];
  try {
    listingPool = await ebayService.getListingCandidatesForSeed({ maxTotal: Math.min(maxRows, 560) });
  } catch (e) {
    console.warn('⚠️ eBay listing seed pool unavailable:', e.message || e);
  }

  const db = getDb();
  let added = 0;

  if (listingPool.length > 0) {
    const nTake = Math.min(listingPool.length, maxRows);

    for (let i = 0; i < nTake; i++) {
      const item = listingPool[i];
      const categoryId = resolveCategoryId(prepare, item.categoryName);
      const srcId = legacyEbayListingId(item.ebayItemId || '') || item.ebayItemId;
      db.run(
        `INSERT INTO deals (ebay_item_id, source_item_id, source, title, image_url, original_price, current_price,
          discount_percent, currency, condition, ebay_url, category_id, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          item.ebayItemId,
          srcId,
          'ebay',
          (item.title || 'Listing').slice(0, 500),
          item.imageUrl || '',
          item.originalPrice,
          item.currentPrice,
          item.discountPercent,
          item.currency || 'USD',
          item.condition || 'New',
          item.affiliateUrl,
          categoryId
        ]
      );
      added++;
    }

    saveDatabase();
    console.log(`✅ Seeded ${added} deals from live eBay listing URLs (${nTake} unique rows)`);
    return { added, mode: 'ebay_listings', searchFallback: false };
  }

  added = insertSyntheticDealRows(db, prepare, campaignId, maxRows);
  saveDatabase();
  console.warn(
    `⚠️ Added ${added} synthetic deals with search-only eBay URLs (configure API credentials to use real listings).`
  );

  return { added, mode: 'synthetic_search', searchFallback: true };
}

/** First boot when DB has zero deals. */
export async function bootstrapEmptyDatabaseWithSamples({ prepare, getDb, saveDatabase }) {
  const existing = prepare('SELECT COUNT(*) as count FROM deals').get();
  if (existing.count > 0) return { added: 0, skipped: true };

  console.log('📦 Adding sample deals (listing URLs preferred)...');
  return seedFromListingPoolOrSynthetic({ prepare, getDb, saveDatabase, maxRows: 1000 });
}

/** Admin: remove old sample-* rows and repopulate. */
export async function adminReseedSampleDeals({ prepare, getDb, saveDatabase, maxRows = 120 }) {
  prepare("DELETE FROM deals WHERE ebay_item_id LIKE 'sample-%'").run();
  return seedFromListingPoolOrSynthetic({ prepare, getDb, saveDatabase, maxRows });
}
