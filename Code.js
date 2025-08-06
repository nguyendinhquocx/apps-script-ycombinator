// ===== MAIN APPS SCRIPT FUNCTIONS =====

/**
 * Main function triggered by button in Google Sheet
 */
function showFilterDialog() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('FilterDialog')
      .setWidth(450)
      .setHeight(300);
    
    SpreadsheetApp.getUi()
      .showModalDialog(html, '🔍 Filter HN Posts');
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

/**
 * Process filter criteria and return filtered results
 */
function filterPosts(minComments = 100, minScore = 0) {
  try {
    Logger.log(`Starting filter with minComments: ${minComments}, minScore: ${minScore}`);
    
    // Get data from ycombinator sheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ycombinator');
    if (!sheet) {
      throw new Error('Sheet "ycombinator" not found');
    }
    
    // Get all data from sheet
    const data = sheet.getDataRange().getValues();
    
    if (data.length === 0) {
      throw new Error('No data found in sheet');
    }
    
    Logger.log(`Found ${data.length} rows of data`);
    
    // Find header row (usually first row with column names)
    let headerRow = 0;
    let headers = [];
    
    // Look for header row (contains column names like "title", "score", "comments", etc.)
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      if (row.some(cell => 
        cell && typeof cell === 'string' && 
        (cell.toLowerCase().includes('title') || 
         cell.toLowerCase().includes('score') || 
         cell.toLowerCase().includes('comment'))
      )) {
        headerRow = i;
        headers = row.map(h => h ? h.toString().toLowerCase().trim() : '');
        Logger.log(`Found headers at row ${i}: ${headers.join(', ')}`);
        break;
      }
    }
    
    if (headers.length === 0) {
      throw new Error('Could not find header row. Please make sure your data has column headers.');
    }
    
    // Find column indexes for HN data structure
    const columnIndexes = {
      rank: findColumnIndex(headers, ['rank']),
      titleline: findColumnIndex(headers, ['titleline']),          // Title text
      titlelineHref: findColumnIndex(headers, ['titleline href']), // Link URL
      sitestr: findColumnIndex(headers, ['sitestr']),              // Domain
      score: findColumnIndex(headers, ['score']),                  // Points
      comments: findColumnIndex(headers, ['subline (3)']),         // Comments
      age: findColumnIndex(headers, ['age']),                      // Time ago
      author: findColumnIndex(headers, ['hnuser'])                 // Username
    };
    
    Logger.log('Column indexes found:', columnIndexes);
    
    // Check if required columns exist
    if (columnIndexes.titleline === -1) {
      throw new Error('titleline column not found');
    }
    if (columnIndexes.score === -1) {
      throw new Error('score column not found');
    }
    if (columnIndexes.comments === -1) {
      throw new Error('subline (3) column not found');
    }
    
    const filteredPosts = [];
    
    // Process data rows in pairs (title row + meta row)
    for (let i = headerRow + 1; i < data.length; i += 2) {
      const titleRow = data[i];
      const metaRow = data[i + 1];
      
      // Skip if we don't have both rows
      if (!titleRow || !metaRow) continue;
      
      // Skip if title row doesn't have rank (not a post)
      const rank = getColumnValue(titleRow, columnIndexes.rank, '');
      if (!rank) continue;
      
      // Extract data from title row
      const title = getColumnValue(titleRow, columnIndexes.titleline, 'No title');
      const link = getColumnValue(titleRow, columnIndexes.titlelineHref, '');
      const domain = getColumnValue(titleRow, columnIndexes.sitestr, '');
      
      // Extract data from meta row
      const scoreText = getColumnValue(metaRow, columnIndexes.score, '0');
      const score = extractNumber(scoreText);
      
      const commentsText = getColumnValue(metaRow, columnIndexes.comments, '0');
      const comments = extractNumber(commentsText);
      
      const age = getColumnValue(metaRow, columnIndexes.age, '');
      const author = getColumnValue(metaRow, columnIndexes.author, '');
      
      Logger.log(`Processing post #${rank}: ${title} - ${score}pts, ${comments}cmt`);
      
      // Apply filters
      if (score >= minScore && comments >= minComments && title !== 'No title' && title.trim() !== '') {
        filteredPosts.push({
          title: title,
          link: link,
          domain: domain,
          score: score,
          comments: comments,
          age: cleanAge(age),
          author: author,
          displayText: `${title} (${score}pts, ${comments}cmt) - ${domain}`
        });
        Logger.log(`✓ Post added: ${title}`);
      } else {
        Logger.log(`✗ Post filtered out: ${title} (score: ${score}/${minScore}, comments: ${comments}/${minComments})`);
      }
    }
    
    // Sort by comments descending, limit to 10
    filteredPosts.sort((a, b) => b.comments - a.comments);
    const topPosts = filteredPosts.slice(0, 10);
    
    Logger.log(`Final filtered posts: ${topPosts.length}`);
    topPosts.forEach(post => {
      Logger.log(`- ${post.title}: ${post.score}pts, ${post.comments}cmt`);
    });
    
    return topPosts;
    
  } catch (error) {
    Logger.log('Filter error: ' + error.toString());
    Logger.log('Error stack: ' + error.stack);
    throw error;
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Find column index by matching possible header names
 */
function findColumnIndex(headers, possibleNames) {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (possibleNames.some(name => header.includes(name))) {
      return i;
    }
  }
  return -1;
}

/**
 * Get value from specific column, with fallback
 */
function getColumnValue(row, columnIndex, fallback = '') {
  if (columnIndex === -1 || columnIndex >= row.length) {
    return fallback;
  }
  const value = row[columnIndex];
  return value ? value.toString().trim() : fallback;
}

/**
 * Extract numeric value from text
 */
function extractNumber(text) {
  if (!text) return 0;
  const match = text.toString().match(/\d+/);
  return match ? parseInt(match[0]) : 0;
}

/**
 * Clean age text
 */
function cleanAge(age) {
  if (!age) return '';
  return age.toString()
    .replace(' |', '')
    .replace(/\s+ago\s*$/, ' ago')
    .trim();
}

/**
 * Show results dialog with filtered posts
 */
function showResultsDialog(posts) {
  try {
    if (!posts || posts.length === 0) {
      SpreadsheetApp.getUi().alert('No posts found matching your criteria. Try lowering the thresholds.');
      return;
    }
    
    // Create results HTML
    let resultsHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <base target="_top">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 15px; 
            background: #f8f9fa; 
            font-size: 13px;
          }
          .container { 
            background: white; 
            padding: 20px; 
            border-radius: 12px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            max-height: 500px;
            overflow-y: auto;
          }
          .title { 
            font-size: 18px; 
            font-weight: 600; 
            margin-bottom: 15px; 
            text-align: center; 
            color: #1f2937; 
            position: sticky;
            top: 0;
            background: white;
            z-index: 10;
          }
          .post-item { 
            padding: 10px; 
            border: 2px solid #e5e7eb; 
            border-radius: 8px; 
            margin-bottom: 8px; 
            display: flex; 
            align-items: flex-start;
            transition: border-color 0.2s;
            background: white;
          }
          .post-item:hover { border-color: #3b82f6; background: #f8fafc; }
          .checkbox { margin-right: 10px; margin-top: 2px; transform: scale(1.1); }
          .post-info { flex: 1; }
          .post-title { 
            font-weight: 500; 
            color: #1f2937; 
            line-height: 1.4; 
            margin-bottom: 4px;
            font-size: 13px;
          }
          .post-meta { 
            font-size: 11px; 
            color: #6b7280; 
          }
          .buttons { 
            display: flex; 
            gap: 10px; 
            margin-top: 15px; 
            position: sticky;
            bottom: 0;
            background: white;
            padding-top: 10px;
          }
          .btn { 
            flex: 1; 
            padding: 10px; 
            border: none; 
            border-radius: 8px; 
            font-weight: 500; 
            cursor: pointer; 
            font-size: 13px;
          }
          .btn-cancel { background: #f3f4f6; color: #6b7280; }
          .btn-cancel:hover { background: #e5e7eb; }
          .btn-primary { background: #3b82f6; color: white; }
          .btn-primary:hover { background: #2563eb; }
          .select-all { 
            margin-bottom: 15px; 
            font-size: 13px; 
            color: #6b7280; 
            background: white;
            position: sticky;
            top: 35px;
            z-index: 9;
            padding: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="title">📋 Found ${posts.length} Posts (Top by Comments)</div>
          
          <div class="select-all">
            <label>
              <input type="checkbox" id="selectAll" onchange="toggleAll()" checked> 
              Select All Posts
            </label>
          </div>
          
          <div id="postsList">
    `;
    
    posts.forEach((post, index) => {
      const truncatedTitle = post.title.length > 80 ? post.title.substring(0, 80) + '...' : post.title;
      const postLink = post.link || '#';
      resultsHtml += `
        <div class="post-item">
          <input type="checkbox" class="checkbox post-checkbox" value="${postLink}" ${postLink !== '#' ? 'checked' : ''}>
          <div class="post-info">
            <div class="post-title">${truncatedTitle}</div>
            <div class="post-meta">
              💬 ${post.comments} comments • ⭐ ${post.score} points • ⏰ ${post.age} • 🌐 ${post.domain}
              ${post.author ? ' • 👤 ' + post.author : ''}
            </div>
          </div>
        </div>
      `;
    });
    
    resultsHtml += `
          </div>
          
          <div class="buttons">
            <button class="btn btn-cancel" onclick="google.script.host.close()">Cancel</button>
            <button class="btn btn-primary" onclick="openSelected()">🚀 Open Selected</button>
          </div>
        </div>
        
        <script>
          function toggleAll() {
            const selectAll = document.getElementById('selectAll');
            const checkboxes = document.querySelectorAll('.post-checkbox');
            checkboxes.forEach(cb => cb.checked = selectAll.checked);
          }
          
          function openSelected() {
            const checkboxes = document.querySelectorAll('.post-checkbox:checked');
            const selectedLinks = Array.from(checkboxes)
              .map(cb => cb.value)
              .filter(link => link && link !== '#');
            
            if (selectedLinks.length === 0) {
              alert('Please select at least one post with a valid link to open.');
              return;
            }
            
            // Show confirmation
            if (!confirm(\`Open \${selectedLinks.length} links in new tabs?\`)) {
              return;
            }
            
            // Open links with delay
            selectedLinks.forEach((link, index) => {
              setTimeout(() => {
                window.open(link, '_blank', 'noopener,noreferrer');
              }, index * 250);
            });
            
            // Close dialog after a moment
            setTimeout(() => {
              google.script.host.close();
            }, 1000);
          }
        </script>
      </body>
      </html>
    `;
    
    const html = HtmlService.createHtml(resultsHtml)
      .setWidth(700)
      .setHeight(600);
    
    SpreadsheetApp.getUi()
      .showModalDialog(html, '🎯 HN Posts Filter Results');
      
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error showing results: ' + error.toString());
  }
}

/**
 * Add button to sheet (run this once to set up)
 */
function addFilterButton() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ycombinator');
    if (!sheet) {
      SpreadsheetApp.getUi().alert('Sheet "ycombinator" not found');
      return;
    }
    
    // Insert button using drawing (alternative method)
    SpreadsheetApp.getUi().alert(
      'To add the filter button:\n\n' +
      '1. Go to Insert → Drawing\n' +
      '2. Add a text box with "🔍 Filter HN Posts"\n' +
      '3. Save and close\n' +
      '4. Click the drawing, then click the 3-dot menu\n' +
      '5. Choose "Assign script" and enter: showFilterDialog\n\n' +
      'Or use Insert → Button and assign the showFilterDialog function.'
    );
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error: ' + error.toString());
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * Test function to debug data parsing - Run this first!
 */
function debugDataParsing() {
  try {
    Logger.log('=== DEBUG DATA PARSING ===');
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ycombinator');
    if (!sheet) {
      Logger.log('❌ Sheet "ycombinator" not found');
      return;
    }
    
    const data = sheet.getDataRange().getValues();
    Logger.log(`Sheet has ${data.length} rows, ${data[0]?.length || 0} columns`);
    
    // Show first few rows
    Logger.log('\n--- First 5 rows of data ---');
    for (let i = 0; i < Math.min(5, data.length); i++) {
      Logger.log(`Row ${i}: [${data[i].join(', ')}]`);
    }
    
    // Try to find headers
    let headerRow = 0;
    let headers = [];
    
    for (let i = 0; i < Math.min(5, data.length); i++) {
      const row = data[i];
      if (row.some(cell => 
        cell && typeof cell === 'string' && 
        (cell.toLowerCase().includes('title') || 
         cell.toLowerCase().includes('score') || 
         cell.toLowerCase().includes('comment'))
      )) {
        headerRow = i;
        headers = row.map(h => h ? h.toString().toLowerCase().trim() : '');
        Logger.log(`✓ Found headers at row ${i}: [${headers.join(', ')}]`);
        break;
      }
    }
    
    if (headers.length === 0) {
      Logger.log('❌ No header row found');
      Logger.log('Please make sure your sheet has column headers like: title, score, comments, link, etc.');
    } else {
      // Find column indexes for HN data structure
      const columnIndexes = {
        rank: findColumnIndex(headers, ['rank']),
        titleline: findColumnIndex(headers, ['titleline']),          // Title text
        titlelineHref: findColumnIndex(headers, ['titleline href']), // Link URL
        sitestr: findColumnIndex(headers, ['sitestr']),              // Domain
        score: findColumnIndex(headers, ['score']),                  // Points
        comments: findColumnIndex(headers, ['subline (3)']),         // Comments
        age: findColumnIndex(headers, ['age']),                      // Time ago
        author: findColumnIndex(headers, ['hnuser'])                 // Username
      };
      
      Logger.log('\n--- Column mapping ---');
      Object.entries(columnIndexes).forEach(([field, index]) => {
        if (index >= 0) {
          Logger.log(`✓ ${field}: Column ${index} (${headers[index]})`);
        } else {
          Logger.log(`❌ ${field}: Not found`);
        }
      });
      
      // Show sample data from first few post pairs
      Logger.log('\n--- Sample data (pairs) ---');
      for (let i = headerRow + 1; i < Math.min(headerRow + 7, data.length); i += 2) {
        const titleRow = data[i];
        const metaRow = data[i + 1];
        
        if (!titleRow || !metaRow) continue;
        
        const rank = getColumnValue(titleRow, columnIndexes.rank);
        const title = getColumnValue(titleRow, columnIndexes.titleline);
        const link = getColumnValue(titleRow, columnIndexes.titlelineHref);
        const score = getColumnValue(metaRow, columnIndexes.score);
        const comments = getColumnValue(metaRow, columnIndexes.comments);
        
        Logger.log(`Post #${rank}:`);
        Logger.log(`  Title: ${title}`);
        Logger.log(`  Link: ${link}`);
        Logger.log(`  Score: ${score} -> ${extractNumber(score)}`);
        Logger.log(`  Comments: ${comments} -> ${extractNumber(comments)}`);
        Logger.log(`---`);
      }
    }
    
    Logger.log('\n=== END DEBUG ===');
    
  } catch (error) {
    Logger.log('❌ Debug error: ' + error.toString());
    Logger.log('Stack: ' + error.stack);
  }
}