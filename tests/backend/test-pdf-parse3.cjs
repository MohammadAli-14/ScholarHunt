const pdfParse = require('pdf-parse');

// Let's check what the actual export structure looks like
console.log('Checking module exports more carefully...');

// The correct usage based on common patterns
// Let's try to see if there's a specific method
const fs = require('fs');

// Create a simple PDF buffer for testing
const testBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

// Try the most common pattern - the module itself might be a function
// Let's check if the module has a callable signature
if (typeof pdfParse === 'function') {
    console.log('Module is a function');
    try {
        const result = pdfParse(testBuffer);
        console.log('Function call result:', result);
    } catch (error) {
        console.log('Function call error:', error.message);
    }
} else {
    console.log('Module is not a function, checking for parse method...');
    
    // Check if there's a parse method
    if (pdfParse.parse && typeof pdfParse.parse === 'function') {
        console.log('Found parse method');
        try {
            const result = pdfParse.parse(testBuffer);
            console.log('Parse method result:', result);
        } catch (error) {
            console.log('Parse method error:', error.message);
        }
    }
    
    // Check if it's a constructor that needs to be instantiated
    if (pdfParse.PDFParse && typeof pdfParse.PDFParse === 'function') {
        console.log('Found PDFParse constructor');
        try {
            const parser = new pdfParse.PDFParse(testBuffer);
            console.log('Parser instance:', parser);
            if (typeof parser.parse === 'function') {
                const result = parser.parse();
                console.log('Instance parse result:', result);
            }
        } catch (error) {
            console.log('Constructor error:', error.message);
        }
    }
}

// Let's also check the actual documentation pattern by looking at common usage
console.log('\nTrying common patterns from documentation...');

// Pattern 1: Direct function call (most common)
try {
    // This should work according to most documentation
    const data = pdfParse(testBuffer);
    console.log('Direct call pattern worked:', data);
} catch (error) {
    console.log('Direct call pattern failed:', error.message);
}

// Pattern 2: Using .then() with promise
try {
    pdfParse(testBuffer).then(data => {
        console.log('Promise pattern worked:', data);
    }).catch(err => {
        console.log('Promise pattern failed:', err.message);
    });
} catch (error) {
    console.log('Promise pattern error:', error.message);
}