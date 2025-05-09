// Fetch and load subscription data from backend
let editMode = false;     // Is the user editing right now?
let editId = null;        // Which subscription is being edited?

async function loadSubscriptions() {
  try {
    const response = await fetch("http://localhost:3000/subscriptions");
    const data = await response.json();

    // Convert the object of objects into an array of objects
    return Object.entries(data).map(([id, subscription]) => ({
      id,
      ...subscription,
      active:
        subscription.expiry_date === "NA" ||
        new Date(subscription.expiry_date) >= new Date(),
    }));
  } catch (error) {
    console.error("Error loading subscriptions:", error);
    return [];
  }
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// Format date
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Create table row for subscription
function createSubscriptionRow(subscription) {
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${subscription.name || "N/A"}</td>
    <td>${subscription.username || "N/A"}</td>
    <td class="status-${subscription.active ? "active" : "inactive"}">
        ${subscription.active ? "Active" : "Inactive"}
    </td>
    <td>${subscription.start_date || "N/A"}</td>
    <td>${subscription.expiry_date || "N/A"}</td>
    <td>${subscription.user_id || "N/A"}</td>
    <td>
      <button class="icon-btn edit-btn" onclick="editSubscription('${subscription.id}')">✏️</button>
      <button class="icon-btn delete-btn" onclick="deleteSubscription('${subscription.id}')">🗑️</button>
    </td>
  `;
  return row;
}

// Update statistics
function updateStats(subscriptions) {
  const totalSubscriptions = subscriptions.length;
  const activeSubscriptions = subscriptions.filter(
    (subscription) => subscription.active
  ).length;

  document.getElementById("totalSubscriptions").textContent = totalSubscriptions;
  document.getElementById("activeSubscriptions").textContent = activeSubscriptions;
}

// Filter and sort subscriptions
function filterAndSortSubscriptions(subscriptions, searchTerm, statusFilter, sortBy) {
  let filtered = [...subscriptions];

  // Apply search filter
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (sub) =>
        (sub.name && sub.name.toLowerCase().includes(searchLower)) ||
        (sub.username && sub.username.toLowerCase().includes(searchLower)) ||
        (sub.user_id && sub.user_id.toString().toLowerCase().includes(searchLower))
    );
  }

  // Apply status filter
  if (statusFilter !== "all") {
    const isActive = statusFilter === "active";
    filtered = filtered.filter((sub) => sub.active === isActive);
  }

  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "name":
        return (a.name || "").localeCompare(b.name || "");
      case "date":
        return new Date(b.start_date || 0) - new Date(a.start_date || 0);
      default:
        return 0;
    }
  });

  return filtered;
}

// Initialize the application
async function initializeApp() {
  try {
    const subscriptions = await loadSubscriptions();
    console.log("Loaded subscriptions:", subscriptions);

    const subscriptionsBody = document.getElementById("subscriptionsBody");
    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");
    const sortBy = document.getElementById("sortBy");

    if (!subscriptionsBody) {
      console.error("Could not find subscriptionsBody element");
      return;
    }

    // Store in localStorage for later use (edit/delete)
    localStorage.setItem("subscriptions", JSON.stringify(subscriptions));

    // Render subscriptions
    function render() {
      const storedSubs = JSON.parse(localStorage.getItem("subscriptions")) || [];
      const filteredSubscriptions = filterAndSortSubscriptions(
        storedSubs,
        searchInput.value,
        statusFilter.value,
        sortBy.value
      );

      subscriptionsBody.innerHTML = "";
      filteredSubscriptions.forEach((subscription) => {
        subscriptionsBody.appendChild(createSubscriptionRow(subscription));
      });

      updateStats(filteredSubscriptions);
    }

    // Expose render for global use
    window.renderSubscriptions = render;

    // Add event listeners
    searchInput.addEventListener("input", render);
    statusFilter.addEventListener("change", render);
    sortBy.addEventListener("change", render);

    // Initial render
    render();
  } catch (error) {
    console.error("Error initializing app:", error);
  }
}

// Edit subscription
async function editSubscription(id) {
  try {
    const response = await fetch(`http://localhost:3000/subscriptions/${id}`);
    if (!response.ok) throw new Error("Subscription not found");

    const subToEdit = await response.json();

    document.getElementById("name").value = subToEdit.name;
    document.getElementById("username").value = subToEdit.username;
    document.getElementById("status").checked = subToEdit.active;
    document.getElementById("start-date").value = subToEdit.start_date;
    document.getElementById("expiry-date").value = subToEdit.expiry_date;
    document.getElementById("user-id").value = subToEdit.user_id;

    editMode = true;
    editId = id;

    document.getElementById("submit-btn").textContent = "Update Subscription";
  } catch (error) {
    console.error("Failed to load subscription for editing:", error);
    alert("Could not load subscription data.");
  }
}

// Delete subscription from backend
async function deleteSubscription(id) {
  if (!confirm("Are you sure you want to delete this subscription?")) return;

  try {
    const response = await fetch(`http://localhost:3000/subscriptions/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete subscription from server.");
    }

    // Re-fetch and re-render the table after deletion
    const updatedSubscriptions = await loadSubscriptions();
    localStorage.setItem("subscriptions", JSON.stringify(updatedSubscriptions));
    renderSubscriptions();
  } catch (error) {
    console.error("Error deleting subscription:", error);
    alert("Failed to delete subscription. Please try again.");
  }
}

// Start the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", initializeApp);
