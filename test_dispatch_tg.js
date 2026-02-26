import { notifyDispatchEntry } from './src/services/telegram.js';

const mockDispatch = {
    client_name: "Test Client API",
    project_name: "Mock Project 2026",
    dispatch_id: "2026-02-26-IDE-9999",
    ship_to_mode: "installer",
    dispatch_data: {
        items: [
            { desc: "Sample Print Media Set", qty: 4 },
            { desc: "Window Decals", qty: 2 }
        ],
        totals: { qty: 6 }
    }
};

async function run() {
    console.log("Testing telegram notification output...");
    await notifyDispatchEntry(mockDispatch);
    console.log("Done.");
}
run();
