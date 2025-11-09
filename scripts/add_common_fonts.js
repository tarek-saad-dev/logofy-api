const { query } = require('../api/config/database');

/**
 * Add common fonts to the fonts table
 * Uses Google Fonts CDN URLs for web fonts
 */
async function addCommonFonts() {
    try {
        console.log('🔤 Adding common fonts to database...');

        // List of most common fonts with their Google Fonts URLs
        const commonFonts = [
            // Sans-serif fonts
            { family: 'Roboto', style: 'Regular', weight: 400, url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400&display=swap', fallbacks: ['sans-serif'] },
            { family: 'Roboto', style: 'Bold', weight: 700, url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@700&display=swap', fallbacks: ['sans-serif'] },
            { family: 'Roboto', style: 'Italic', weight: 400, url: 'https://fonts.googleapis.com/css2?family=Roboto:ital,wght@1,400&display=swap', fallbacks: ['sans-serif'] },
            
            { family: 'Open Sans', style: 'Regular', weight: 400, url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400&display=swap', fallbacks: ['sans-serif'] },
            { family: 'Open Sans', style: 'Bold', weight: 700, url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@700&display=swap', fallbacks: ['sans-serif'] },
            
            { family: 'Lato', style: 'Regular', weight: 400, url: 'https://fonts.googleapis.com/css2?family=Lato:wght@400&display=swap', fallbacks: ['sans-serif'] },
            { family: 'Lato', style: 'Bold', weight: 700, url: 'https://fonts.googleapis.com/css2?family=Lato:wght@700&display=swap', fallbacks: ['sans-serif'] },
            
            { family: 'Montserrat', style: 'Regular', weight: 400, url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400&display=swap', fallbacks: ['sans-serif'] },
            { family: 'Montserrat', style: 'Bold', weight: 700, url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap', fallbacks: ['sans-serif'] },
            
            { family: 'Poppins', style: 'Regular', weight: 400, url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400&display=swap', fallbacks: ['sans-serif'] },
            { family: 'Poppins', style: 'Bold', weight: 700, url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@700&display=swap', fallbacks: ['sans-serif'] },
            
            { family: 'Raleway', style: 'Regular', weight: 400, url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@400&display=swap', fallbacks: ['sans-serif'] },
            { family: 'Raleway', style: 'Bold', weight: 700, url: 'https://fonts.googleapis.com/css2?family=Raleway:wght@700&display=swap', fallbacks: ['sans-serif'] },
            
            { family: 'Ubuntu', style: 'Regular', weight: 400, url: 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@400&display=swap', fallbacks: ['sans-serif'] },
            { family: 'Ubuntu', style: 'Bold', weight: 700, url: 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@700&display=swap', fallbacks: ['sans-serif'] },
            
            // Serif fonts
            { family: 'Playfair Display', style: 'Regular', weight: 400, url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&display=swap', fallbacks: ['serif'] },
            { family: 'Playfair Display', style: 'Bold', weight: 700, url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap', fallbacks: ['serif'] },
            
            { family: 'Merriweather', style: 'Regular', weight: 400, url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400&display=swap', fallbacks: ['serif'] },
            { family: 'Merriweather', style: 'Bold', weight: 700, url: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@700&display=swap', fallbacks: ['serif'] },
            
            // System fonts (no URL needed, use system fallback)
            { family: 'Arial', style: 'Regular', weight: 400, url: 'system://arial', fallbacks: ['sans-serif', 'Helvetica'] },
            { family: 'Arial', style: 'Bold', weight: 700, url: 'system://arial-bold', fallbacks: ['sans-serif', 'Helvetica'] },
            
            { family: 'Helvetica', style: 'Regular', weight: 400, url: 'system://helvetica', fallbacks: ['sans-serif', 'Arial'] },
            { family: 'Helvetica', style: 'Bold', weight: 700, url: 'system://helvetica-bold', fallbacks: ['sans-serif', 'Arial'] },
            
            { family: 'Times New Roman', style: 'Regular', weight: 400, url: 'system://times-new-roman', fallbacks: ['serif', 'Times'] },
            { family: 'Times New Roman', style: 'Bold', weight: 700, url: 'system://times-new-roman-bold', fallbacks: ['serif', 'Times'] },
            
            { family: 'Georgia', style: 'Regular', weight: 400, url: 'system://georgia', fallbacks: ['serif'] },
            { family: 'Georgia', style: 'Bold', weight: 700, url: 'system://georgia-bold', fallbacks: ['serif'] },
            
            { family: 'Verdana', style: 'Regular', weight: 400, url: 'system://verdana', fallbacks: ['sans-serif'] },
            { family: 'Verdana', style: 'Bold', weight: 700, url: 'system://verdana-bold', fallbacks: ['sans-serif'] },
            
            { family: 'Courier New', style: 'Regular', weight: 400, url: 'system://courier-new', fallbacks: ['monospace'] },
            { family: 'Courier New', style: 'Bold', weight: 700, url: 'system://courier-new-bold', fallbacks: ['monospace'] },
            
            // Display/Decorative fonts
            { family: 'Oswald', style: 'Regular', weight: 400, url: 'https://fonts.googleapis.com/css2?family=Oswald:wght@400&display=swap', fallbacks: ['sans-serif'] },
            { family: 'Oswald', style: 'Bold', weight: 700, url: 'https://fonts.googleapis.com/css2?family=Oswald:wght@700&display=swap', fallbacks: ['sans-serif'] },
            
            { family: 'Bebas Neue', style: 'Regular', weight: 400, url: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap', fallbacks: ['sans-serif'] },
            
            { family: 'Impact', style: 'Regular', weight: 400, url: 'system://impact', fallbacks: ['sans-serif', 'Arial Black'] },
        ];

        let added = 0;
        let skipped = 0;

        for (const font of commonFonts) {
            try {
                // Use INSERT ... ON CONFLICT to avoid duplicates
                await query(`
                    INSERT INTO fonts (family, style, weight, url, fallbacks, meta)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (family, weight, style) DO NOTHING
                `, [
                    font.family,
                    font.style,
                    font.weight,
                    font.url,
                    font.fallbacks,
                    { source: 'common_fonts_script', added_at: new Date().toISOString() }
                ]);

                // Check if it was actually inserted
                const checkRes = await query(
                    'SELECT id FROM fonts WHERE family = $1 AND style = $2 AND weight = $3',
                    [font.family, font.style, font.weight]
                );

                if (checkRes.rows.length > 0) {
                    added++;
                    console.log(`  ✅ Added: ${font.family} ${font.style} (${font.weight})`);
                } else {
                    skipped++;
                    console.log(`  ⏭️  Skipped (already exists): ${font.family} ${font.style} (${font.weight})`);
                }
            } catch (error) {
                console.error(`  ❌ Error adding ${font.family} ${font.style}:`, error.message);
            }
        }

        console.log(`\n✅ Font insertion complete!`);
        console.log(`   Added: ${added} fonts`);
        console.log(`   Skipped: ${skipped} fonts (already exist)`);
        console.log(`   Total: ${commonFonts.length} fonts processed\n`);

    } catch (error) {
        console.error('❌ Error adding common fonts:', error);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    addCommonFonts()
        .then(() => {
            console.log('✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
}

module.exports = { addCommonFonts };

