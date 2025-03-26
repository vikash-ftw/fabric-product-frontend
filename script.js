// Base URL for the API (replace with your actual localhost/IP and port)
const BASE_URL = "http://localhost:8000";

// Function to display Add Product response in custom format
function displayAddResponse(data) {
    const responseContainer = document.getElementById("addResponseOutput");
    const loadingContainer = document.getElementById("addResponseLoading");
    const statusElement = document.getElementById("addStatus");
    const dataElement = document.getElementById("addData");
    const messageElement = document.getElementById("addMessage");

    // Hide loading and show response
    loadingContainer.style.display = "none";
    responseContainer.style.display = "block";

    // Handle case sensitivity in statuscode/statusCode
    const statusCode = data.statuscode || data.statusCode || "Unknown";

    // Set the content
    statusElement.textContent = statusCode;
    messageElement.textContent = data.message || "No message provided";

    if (statusCode === 200 && data.data) {
        dataElement.textContent = JSON.stringify(data.data, null, 2);
    } else {
        dataElement.textContent = "N/A";
    }

    // Set background color based on status
    if (statusCode === 200) {
        responseContainer.classList.remove("error");
        responseContainer.classList.add("success");
    } else {
        responseContainer.classList.remove("success");
        responseContainer.classList.add("error");
    }
}

// Function to clear Add Product response and show loading
function clearAddResponseAndShowLoading() {
    const responseContainer = document.getElementById("addResponseOutput");
    const loadingContainer = document.getElementById("addResponseLoading");
    const statusElement = document.getElementById("addStatus");
    const dataElement = document.getElementById("addData");
    const messageElement = document.getElementById("addMessage");

    // Hide response, clear content, and show loading
    responseContainer.style.display = "none";
    statusElement.textContent = "";
    dataElement.textContent = "";
    messageElement.textContent = "";
    responseContainer.classList.remove("success", "error");
    loadingContainer.style.display = "block";
}

// Function to display Fetch Product response in custom format
function displayFetchResponse(data) {
    const responseContainer = document.getElementById("fetchResponseOutput");
    const loadingContainer = document.getElementById("fetchResponseLoading");
    const statusElement = document.getElementById("fetchStatus");
    const dataElement = document.getElementById("fetchData");
    const messageElement = document.getElementById("fetchMessage");

    // Hide loading and show response
    loadingContainer.style.display = "none";
    responseContainer.style.display = "block";

    // Handle case sensitivity in statuscode/statusCode
    const statusCode = data.statuscode || data.statusCode || "Unknown";

    // Set the content
    statusElement.textContent = statusCode;
    messageElement.textContent = data.message || "No message provided";

    if (statusCode === 200 && data.data) {
        dataElement.textContent = JSON.stringify(data.data, null, 2);
    } else {
        dataElement.textContent = "N/A";
    }

    // Set background color based on status
    if (statusCode === 200) {
        responseContainer.classList.remove("error");
        responseContainer.classList.add("success");
    } else {
        responseContainer.classList.remove("success");
        responseContainer.classList.add("error");
    }
}

// Function to clear Fetch Product response and show loading
function clearFetchResponseAndShowLoading() {
    const responseContainer = document.getElementById("fetchResponseOutput");
    const loadingContainer = document.getElementById("fetchResponseLoading");
    const statusElement = document.getElementById("fetchStatus");
    const dataElement = document.getElementById("fetchData");
    const messageElement = document.getElementById("fetchMessage");

    // Hide response, clear content, and show loading
    responseContainer.style.display = "none";
    statusElement.textContent = "";
    dataElement.textContent = "";
    messageElement.textContent = "";
    responseContainer.classList.remove("success", "error");
    loadingContainer.style.display = "block";
}

// Add Product Form Submission
document.getElementById("addProductForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    // Clear the previous response and show loading
    clearAddResponseAndShowLoading();

    const productData = {
        productNumber: document.getElementById("productNumber").value,
        productManufacturer: document.getElementById("productManufacturer").value,
        productName: document.getElementById("productName").value,
        productOwnerName: document.getElementById("productOwnerName").value
    };

    try {
        const response = await fetch(`${BASE_URL}/products/addProduct`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(productData)
        });

        const data = await response.json();
        displayAddResponse(data);
    } catch (error) {
        displayAddResponse({ statusCode: "Error", message: "Failed to add product: " + error.message });
    }
});

// Fetch Product Form Submission
document.getElementById("fetchProductForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    // Clear the previous response and show loading
    clearFetchResponseAndShowLoading();

    const fetchData = {
        productNumber: document.getElementById("fetchProductNumber").value
    };

    try {
        const response = await fetch(`${BASE_URL}/products/getProduct`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(fetchData)
        });

        const data = await response.json();
        displayFetchResponse(data);
    } catch (error) {
        displayFetchResponse({ statusCode: "Error", message: "Failed to fetch product: " + error.message });
    }
});