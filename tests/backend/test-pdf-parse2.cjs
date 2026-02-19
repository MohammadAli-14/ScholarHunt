const pdfModule = require('pdf-parse');

console.log('Module structure:');
console.log(Object.keys(pdfModule));

// Check if there's a specific method to use
if (pdfModule.PDFParse) {
    console.log('PDFParse class found:', typeof pdfModule.PDFParse);
    
    // Test creating an instance
    try {
        const parser = new pdfModule.PDFParse();
        console.log('Parser instance created:', parser);
    } catch (error) {
        console.log('Error creating parser instance:', error.message);
    }
}

// Check for any parse method
if (pdfModule.parse) {
    console.log('parse method found');
} else {
    console.log('No parse method found');
}

// Check the actual usage from documentation
console.log('Checking for default export pattern...');
if (pdfModule.default) {
    console.log('Default export found:', typeof pdfModule.default);
}