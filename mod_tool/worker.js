// Web Worker for processing WASM without blocking the main thread

let wasmModule = null;

// Listen for messages from the main thread
self.onmessage = async function(e) {
    const { type, data } = e.data;

    if (type === 'init') {
        // Initialize the WASM module
        try {
            const { wasmUrl, mjsUrl } = data;
            
            // Import the WASM loader
            const { compileStreaming } = await import(mjsUrl);
            
            // Compile and instantiate the WASM module
            const compiled = await compileStreaming(fetch(wasmUrl));
            wasmModule = await compiled.instantiate();
            
            // Invoke main to set up exported functions
            await wasmModule.invokeMain();
            
            self.postMessage({ type: 'init-success' });
        } catch (error) {
            self.postMessage({ type: 'init-error', error: error.message });
        }
    } else if (type === 'process') {
        // Process the file
        try {
            const { uint8Array } = data;
            
            if (!wasmModule || !self.analyzeModFile) {
                throw new Error('WASM module not initialized');
            }
            
            // Call the global function that was set up by main()
            const result = self.analyzeModFile(uint8Array);
            
            self.postMessage({ type: 'process-success', result });
        } catch (error) {
            self.postMessage({ type: 'process-error', error: error.message });
        }
    }
};
