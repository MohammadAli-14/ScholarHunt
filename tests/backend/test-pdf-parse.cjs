const pdf = require('pdf-parse');
const fs = require('fs');

// Test the pdf-parse function to see how it should be called
console.log('pdf function type:', typeof pdf);
console.log('pdf function:', pdf);

// Check if it's a function or has specific methods
if (typeof pdf === 'function') {
    console.log('pdf is a function - can be called directly');
} else if (pdf && typeof pdf.default === 'function') {
    console.log('pdf has default export - use pdf.default()');
} else if (pdf && pdf.pdfParse) {
    console.log('pdf has pdfParse method');
}

// Test with a simple buffer
const testBuffer = Buffer.from('test content');
try {
    const result = pdf(testBuffer);
    console.log('Direct call result:', result);
} catch (error) {
    console.log('Direct call error:', error.message);
}

// Test with .then() approach
try {
    pdf(testBuffer).then(data => {
        console.log('Promise result:', data);
    }).catch(err => {
        console.log('Promise error:', err.message);
    });
} catch (error) {
    console.log('Promise approach error:', error.message);
}