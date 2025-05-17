// Initialize Supabase client (replace with your keys)
const supabaseUrl = 'https://bidotqqjspfyaexqlxdt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZG90cXFqc3BmeWFleHFseGR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0OTI0MTIsImV4cCI6MjA2MzA2ODQxMn0.OW7XnCJ35ygpUZ5wftPkB4zalSdwf5YbInuEhFCPufo';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM Elements and event listeners same as before
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    document.getElementById('expenseForm').addEventListener('submit', addExpense);
    document.getElementById('editBudgetForm').addEventListener('submit', updateBudget);
    document.getElementById('resetBudgetBtn').addEventListener('click', resetBudget);
    document.body.addEventListener('submit', function(event) {
        if (event.target.id === 'editExpenseForm') {
            event.preventDefault();
            updateExpense(event);
        }
    });
});

async function initApp() {
    displayCurrentMonth();
    await loadBudget();
    await loadExpenses();
    await updateBudgetDisplay();
}

function displayCurrentMonth() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();
    const monthYear = `${months[now.getMonth()]} ${now.getFullYear()}`;
    document.getElementById('currentMonth').textContent = monthYear;
}

function getCurrentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Load budget from Supabase or set to 0 if not exists
async function loadBudget() {
    const currentMonth = getCurrentMonthKey();
    
    const { data, error } = await supabase
        .from('budgets')
        .select('amount')
        .eq('month', currentMonth)
        .single();

    let budgetAmount = 0;
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error loading budget:', error);
        alert('Failed to load budget.');
        return;
    }
    
    if (data) {
        budgetAmount = data.amount;
    } else {
        // Insert a default budget 0 if none exists
        const { error: insertError } = await supabase
            .from('budgets')
            .insert([{ month: currentMonth, amount: 0 }]);
        if (insertError) {
            console.error('Error inserting default budget:', insertError);
        }
    }

    document.getElementById('budgetAmount').textContent = formatCurrency(budgetAmount);
    document.getElementById('editBudgetAmount').value = budgetAmount;
}

// Load expenses from Supabase for current month
async function loadExpenses() {
    const currentMonth = getCurrentMonthKey();

    const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('month', currentMonth)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error loading expenses:', error);
        alert('Failed to load expenses.');
        return;
    }

    renderExpensesTable(data || []);
}

// Update the budget amount in Supabase
async function updateBudget(event) {
    event.preventDefault();

    const budgetInput = document.getElementById('editBudgetAmount');
    const newBudget = parseFloat(budgetInput.value);

    if (isNaN(newBudget) || newBudget < 0) {
        alert('Please enter a valid budget amount');
        return;
    }

    const currentMonth = getCurrentMonthKey();

    // Upsert budget
    const { error } = await supabase
        .from('budgets')
        .upsert({ month: currentMonth, amount: newBudget }, { onConflict: 'month' });

    if (error) {
        console.error('Error updating budget:', error);
        alert('Failed to update budget.');
        return;
    }

    document.getElementById('budgetAmount').textContent = formatCurrency(newBudget);
    await updateBudgetDisplay();

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editBudgetModal'));
    modal.hide();
}

// Reset budget to zero in Supabase
async function resetBudget() {
    const currentMonth = getCurrentMonthKey();

    const { error } = await supabase
        .from('budgets')
        .upsert({ month: currentMonth, amount: 0 }, { onConflict: 'month' });

    if (error) {
        console.error('Error resetting budget:', error);
        alert('Failed to reset budget.');
        return;
    }

    document.getElementById('budgetAmount').textContent = formatCurrency(0);
    document.getElementById('editBudgetAmount').value = 0;
    await updateBudgetDisplay();

    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editBudgetModal'));
    modal.hide();
}

// Add a new expense to Supabase
async function addExpense(event) {
    event.preventDefault();

    const restaurantInput = document.getElementById('restaurantName');
    const priceInput = document.getElementById('expensePrice');

    const restaurant = restaurantInput.value.trim();
    const price = parseFloat(priceInput.value);

    if (restaurant === '') {
        alert('Please enter a restaurant name');
        return;
    }

    if (isNaN(price) || price <= 0) {
        alert('Please enter a valid price');
        return;
    }

    const currentMonth = getCurrentMonthKey();
    const date = new Date().toISOString().split('T')[0];

    const { error } = await supabase
        .from('expenses')
        .insert([{ month: currentMonth, restaurant, price, date }]);

    if (error) {
        console.error('Error adding expense:', error);
        alert('Failed to add expense.');
        return;
    }

    // Refresh expenses and UI
    await loadExpenses();
    await updateBudgetDisplay();

    // Reset form
    restaurantInput.value = '';
    priceInput.value = '';
    restaurantInput.focus();
}

// Render expenses table (same as before, but data comes from Supabase)
function renderExpensesTable(expenses) {
    const tableBody = document.getElementById('expensesTableBody');
    const totalElement = document.getElementById('totalSpent');

    tableBody.innerHTML = '';

    let total = 0;

    expenses.forEach(expense => {
        total += expense.price;

        const row = document.createElement('tr');
        row.setAttribute('data-id', expense.id);
        row.innerHTML = `
            <td>${expense.restaurant}</td>
            <td>₱${expense.price.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td>${formatDate(expense.date)}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary edit-expense" data-id="${expense.id}">Edit</button>
                <button class="btn btn-sm btn-outline-danger delete-expense" data-id="${expense.id}">Delete</button>
            </td>
        `;

        tableBody.appendChild(row);
    });

    // Add event listeners to edit and delete buttons
    document.querySelectorAll('.edit-expense').forEach(button => {
        button.addEventListener('click', function() {
            const expenseId = parseInt(this.getAttribute('data-id'));
            editExpense(expenseId);
        });
    });

    document.querySelectorAll('.delete-expense').forEach(button => {
        button.addEventListener('click', function() {
            const expenseId = parseInt(this.getAttribute('data-id'));
            deleteExpense(expenseId);
        });
    });

    totalElement.textContent = formatCurrency(total);

    const emptyMessage = document.getElementById('emptyTableMessage');
    if (expenses.length === 0) {
        emptyMessage.classList.remove('d-none');
    } else {
        emptyMessage.classList.add('d-none');
    }
}

// Update budget display (remaining amount)
async function updateBudgetDisplay() {
    const currentMonth = getCurrentMonthKey();

    // Fetch budget
    const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('amount')
        .eq('month', currentMonth)
        .single();

    if (budgetError && budgetError.code !== 'PGRST116') {
        console.error('Error loading budget:', budgetError);
        return;
    }

    const budget = budgetData ? budgetData.amount : 0;

    // Fetch expenses
    const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('price')
        .eq('month', currentMonth);

    if (expensesError) {
        console.error('Error loading expenses:', expensesError);
        return;
    }

    const totalSpent = expenses ? expenses.reduce((sum, e) => sum + e.price, 0) : 0;
    const remaining = budget - totalSpent;

    const remainingDisplay = document.getElementById('remainingAmount');
    remainingDisplay.textContent = formatCurrency(remaining);

    // Change color based on remaining budget
    if (remaining < 0) {
        remainingDisplay.classList.remove('text-success');
        remainingDisplay.classList.add('text-danger');
    } else {
        remainingDisplay.classList.remove('text-danger');
        remainingDisplay.classList.add('text-success');
    }
}

// Format functions
function formatCurrency(amount) {
    return `₱${amount.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
}

function formatDate(dateString) {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-PH');
}

// Edit expense: open modal and load expense data
async function editExpense(id) {
    const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert('Failed to load expense.');
        return;
    }

    // Fill form
    document.getElementById('editExpenseId').value = data.id;
    document.getElementById('editRestaurantName').value = data.restaurant;
    document.getElementById('editExpensePrice').value = data.price;

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editExpenseModal'));
    modal.show();
}

// Update expense in Supabase
async function updateExpense(event) {
    event.preventDefault();

    const id = parseInt(document.getElementById('editExpenseId').value);
    const restaurant = document.getElementById('editRestaurantName').value.trim();
    const price = parseFloat(document.getElementById('editExpensePrice').value);

    if (!id || restaurant === '' || isNaN(price) || price <= 0) {
        alert('Please enter valid expense details.');
        return;
    }

    const { error } = await supabase
        .from('expenses')
        .update({ restaurant, price })
        .eq('id', id);

    if (error) {
        alert('Failed to update expense.');
        return;
    }

    await loadExpenses();
    await updateBudgetDisplay();

    const modal = bootstrap.Modal.getInstance(document.getElementById('editExpenseModal'));
    modal.hide();
}

// Delete expense from Supabase
async function deleteExpense(id) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Failed to delete expense.');
        return;
    }

    await loadExpenses();
    await updateBudgetDisplay();
}
