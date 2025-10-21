const { query } = require('./api/config/database');

async function testThumbnailsQuery() {
  try {
    console.log('🧪 Testing thumbnails query directly...\n');
    
    const page = 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    
    console.log('1️⃣ Testing basic logos query...');
    const logosRes = await query(`
      SELECT 
        l.id,
        l.title,
        l.title_en,
        l.title_ar,
        l.thumbnail_url,
        l.category_id,
        c.name as category_name,
        c.name_en as category_name_en,
        c.name_ar as category_name_ar,
        l.created_at,
        l.updated_at
      FROM logos l
      LEFT JOIN categories c ON c.id = l.category_id
      ORDER BY l.category_id ASC, l.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    console.log(`✅ Query executed successfully, found ${logosRes.rows.length} logos`);
    
    if (logosRes.rows.length > 0) {
      console.log('📝 Sample logo data:');
      const logo = logosRes.rows[0];
      console.log(`  ID: ${logo.id}`);
      console.log(`  Title: ${logo.title}`);
      console.log(`  Title EN: ${logo.title_en}`);
      console.log(`  Title AR: ${logo.title_ar}`);
      console.log(`  Thumbnail URL: ${logo.thumbnail_url}`);
      console.log(`  Category ID: ${logo.category_id}`);
      console.log(`  Category Name: ${logo.category_name}`);
      console.log(`  Category Name EN: ${logo.category_name_en}`);
      console.log(`  Category Name AR: ${logo.category_name_ar}`);
      console.log(`  Created: ${logo.created_at}`);
      console.log(`  Updated: ${logo.updated_at}`);
    }
    
    console.log('\n2️⃣ Testing count query...');
    const totalRes = await query('SELECT COUNT(*)::int AS total FROM logos l');
    const total = totalRes.rows[0].total;
    console.log(`✅ Total logos: ${total}`);
    
    console.log('\n3️⃣ Testing data formatting...');
    const lang = 'en';
    const formattedLogos = logosRes.rows.map(logo => ({
      id: logo.id,
      title: lang === 'ar' ? (logo.title_ar || logo.title_en || logo.title) : (logo.title_en || logo.title),
      thumbnailUrl: logo.thumbnail_url,
      categoryId: logo.category_id,
      categoryName: lang === 'ar' ? (logo.category_name_ar || logo.category_name_en || logo.category_name) : (logo.category_name_en || logo.category_name),
      createdAt: new Date(logo.created_at).toISOString(),
      updatedAt: new Date(logo.updated_at).toISOString(),
      language: lang,
      direction: lang === 'ar' ? 'rtl' : 'ltr'
    }));
    
    console.log(`✅ Formatted ${formattedLogos.length} logos`);
    if (formattedLogos.length > 0) {
      console.log('📝 Sample formatted logo:');
      console.log(JSON.stringify(formattedLogos[0], null, 2));
    }
    
    console.log('\n4️⃣ Testing category grouping...');
    const categoryGroups = [];
    const categoryMap = new Map();
    
    formattedLogos.forEach(logo => {
      const categoryKey = logo.categoryId || 'uncategorized';
      const categoryName = logo.categoryName || 'Uncategorized';
      
      if (!categoryMap.has(categoryKey)) {
        const categoryGroup = {
          categoryId: logo.categoryId,
          categoryName: categoryName,
          logos: []
        };
        categoryMap.set(categoryKey, categoryGroup);
        categoryGroups.push(categoryGroup);
      }
      
      categoryMap.get(categoryKey).logos.push(logo);
    });
    
    console.log(`✅ Created ${categoryGroups.length} category groups`);
    console.log('📝 Category groups:');
    categoryGroups.forEach((group, index) => {
      console.log(`  ${index + 1}. ${group.categoryName} (${group.logos.length} logos)`);
    });
    
    console.log('\n5️⃣ Testing final response structure...');
    const groupedData = categoryGroups.map(group => ({
      category: {
        id: group.categoryId,
        name: group.categoryName
      },
      logos: group.logos
    }));
    
    const finalResponse = {
      success: true,
      message: 'logosFetched',
      data: groupedData,
      pagination: { 
        page, 
        limit, 
        total, 
        pages: Math.ceil(total / limit),
        categoriesCount: categoryGroups.length
      },
      language: lang,
      direction: lang === 'ar' ? 'rtl' : 'ltr'
    };
    
    console.log('✅ Final response structure created');
    console.log('📊 Response summary:');
    console.log(`  - Success: ${finalResponse.success}`);
    console.log(`  - Data groups: ${finalResponse.data.length}`);
    console.log(`  - Total logos: ${finalResponse.pagination.total}`);
    console.log(`  - Categories: ${finalResponse.pagination.categoriesCount}`);
    console.log(`  - Language: ${finalResponse.language}`);
    console.log(`  - Direction: ${finalResponse.direction}`);
    
    console.log('\n✅ All thumbnails query tests passed!');
    
  } catch (error) {
    console.error('❌ Thumbnails query test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testThumbnailsQuery();
