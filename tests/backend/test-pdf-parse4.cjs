// Let's check the actual usage by looking at the module's main export
const pdfParse = require('pdf-parse');

console.log('Module type:', typeof pdfParse);
console.log('Module keys:', Object.keys(pdfParse));

// Let's check if the module itself is callable
if (typeof pdfParse === 'function') {
    console.log('Module is a function - can be called directly');
    
    // Test with a minimal PDF buffer
    const minimalPDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    
    try {
        const result = pdfParse(minimalPDF);
        console.log('Direct call successful:', typeof result);
        if (result && typeof result.then === 'function') {
            result.then(data => {
                console.log('Promise resolved:', data);
            }).catch(err => {
                console.log('Promise rejected:', err.message);
            });
        }
    } catch (error) {
        console.log('Direct call failed:', error.message);
    }
} else {
    console.log('Module is not a function - checking for default export or specific methods');
    
    // Check for default export (common in ES modules)
    if (pdfParse.default && typeof pdfParse.default === 'function') {
        console.log('Default export found');
        const pdfParseDefault = pdfParse.default;
        
        const minimalPDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
        
        try {
            const result = pdfParseDefault(minimalPDF);
            console.log('Default export call successful:', typeof result);
        } catch (error) {
            console.log('Default export call failed:', error.message);
        }
    }
    
    // Check for specific parse method
    if (pdfParse.parsePDF && typeof pdfParse.parsePDF === 'function') {
        console.log('parsePDF method found');
    }
    
    if (pdfParse.parse && typeof pdfParse.parse === 'function') {
        console.log('parse method found');
        
        const minimalPDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
        
        try {
            const result = pdfParse.parse(minimalPDF);
            console.log('Parse method call successful:', typeof result);
        } catch (error) {
            console.log('Parse method call failed:', error.message);
        }
    }
}

// Let's also check if there are any examples in the module
console.log('\nChecking for any example usage patterns...');

// The most common pattern based on documentation should be:
// const pdfParse = require('pdf-parse');
// const data = await pdfParse(buffer);

// But since that's not working, let's check if it's a promise-based API
const minimalPDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

// Try to see if it returns a promise
try {
    const promise = pdfParse(minimalPDF);
    if (promise && typeof promise.then === 'function') {
        console.log('Module returns a promise');
        promise.then(data => {
            console.log('Promise resolved with data:', data);
        }).catch(err => {
            console.log('Promise rejected with error:', err.message);
        });
    } else {
        console.log('Module does not return a promise');
    }
} catch (error) {
    console.log('Error calling module:', error.message);
}