<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>

<script>
  // Initialize Supabase client properly
  const supabase = Supabase.createClient(
    'https://bidotqqjspfyaexqlxdt.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpZG90cXFqc3BmeWFleHFseGR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0OTI0MTIsImV4cCI6MjA2MzA2ODQxMn0.OW7XnCJ35ygpUZ5wftPkB4zalSdwf5YbInuEhFCPufo'
  );

  // DOM Ready
  document.addEventListener('DOMContentLoaded', () => {
    initApp();

    document.getElementById('expenseForm').addEventListener('submit', addExpense);
    document.getElementById('editBudgetForm').addEventListener('submit', updateBudget);
    document.getElementById('resetBudgetBtn').addEventListener('click', resetBudget);

    document.body.addEventListener('submit', event => {
      if (event.target.id === 'editExpenseForm') {
        event.preventDefault();
        updateExpense(event);
      }
    });
  });

  // Globals
  let currentBudget = 0;
  let expensesList = [];

  // Initialize app: load month, budget, expenses, and update UI
  async function initApp() {
    displayCurrentMonth();
    await loadBudget();
    await loadExpenses();
    updateBudgetDisplay();
  }

  // Show current month Year
  function displayCurrentMonth() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();
    document.getElementById('currentMonth').textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  // Load budget from Supabase (assuming only 1 budget record)
  async function loadBudget() {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Failed to load budget:', error.message);
      currentBudget = 0;
      updateBudgetUI(0);
      return;
    }

    currentBudget = data?.amount || 0;
    updateBudgetUI(currentBudget);
  }

  // Update budget UI display
  function updateBudgetUI(amount) {
    document.getElementById('budgetAmount').textContent = formatCurrency(amount);
    document.getElementById('editBudgetAmount').value = amount;
  }

  // Load expenses from Supabase
  async function loadExpenses() {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Failed to load expenses:', error.message);
      expensesList = [];
      renderExpensesTable([]);
      return;
    }

    expensesList = data || [];
    renderExpensesTable(expensesList);
  }

  // Add new expense (submit event)
  async function addExpense(event) {
    event.preventDefault();

    const name = document.getElementById('restaurantName').value.trim();
    const price = parseFloat(document.getElementById('expensePrice').value);

    if (!name || isNaN(price) || price < 0) {
      alert('Please enter valid expense details.');
      return;
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert([{ restaurant_name: name, price, date: new Date().toISOString() }]);

    if (error) {
      console.error('Failed to add expense:', error.message);
      alert('Error adding expense.');
      return;
    }

    document.getElementById('expenseForm').reset();
    await loadExpenses();
    updateBudgetDisplay();
  }

  // Update budget (submit event)
  async function updateBudget(event) {
    event.preventDefault();

    const newBudget = parseFloat(document.getElementById('editBudgetAmount').value);
    if (isNaN(newBudget) || newBudget < 0) {
      alert('Enter a valid budget.');
      return;
    }

    // Assume only one budget record; update or insert accordingly
    const { data: existing, error: fetchError } = await supabase
      .from('budgets')
      .select('*')
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching budget:', fetchError.message);
      return;
    }

    if (existing) {
      // Update
      const { error: updateError } = await supabase
        .from('budgets')
        .update({ amount: newBudget })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Failed to update budget:', updateError.message);
        return;
      }
    } else {
      // Insert new budget row
      const { error: insertError } = await supabase
        .from('budgets')
        .insert([{ amount: newBudget }]);

      if (insertError) {
        console.error('Failed to insert budget:', insertError.message);
        return;
      }
    }

    currentBudget = newBudget;
    updateBudgetUI(newBudget);
    updateBudgetDisplay();

    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editBudgetModal'));
    modal.hide();
  }

  // Reset budget to zero
  async function resetBudget() {
    const zero = 0;

    // Update budget record to 0
    const { data: existing, error: fetchError } = await supabase
      .from('budgets')
      .select('*')
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching budget:', fetchError.message);
      return;
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('budgets')
        .update({ amount: zero })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Failed to reset budget:', updateError.message);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from('budgets')
        .insert([{ amount: zero }]);

      if (insertError) {
        console.error('Failed to insert budget:', insertError.message);
        return;
      }
    }

    currentBudget = zero;
    updateBudgetUI(zero);
    updateBudgetDisplay();

    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editBudgetModal'));
    modal.hide();
  }

  // Render expenses table rows
  function renderExpensesTable(expenses) {
    const tbody = document.getElementById('expensesTableBody');
    const totalSpentElem = document.getElementById('totalSpent');
    tbody.innerHTML = '';

    if (!expenses.length) {
      document.getElementById('emptyTableMessage').classList.remove('d-none');
      totalSpentElem.textContent = formatCurrency(0);
      return;
    } else {
      document.getElementById('emptyTableMessage').classList.add('d-none');
    }

    let totalSpent = 0;

    expenses.forEach(expense => {
      totalSpent += expense.price;

      const tr = document.createElement('tr');
      tr.setAttribute('data-id', expense.id);
      tr.innerHTML = `
        <td>${expense.restaurant_name}</td>
        <td>₱${expense.price.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>${formatDate(expense.date)}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-secondary edit-expense" data-id="${expense.id}">Edit</button>
          <button class="btn btn-sm btn-outline-danger delete-expense" data-id="${expense.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    totalSpentElem.textContent = formatCurrency(totalSpent);

    // Attach event listeners for edit & delete buttons
    tbody.querySelectorAll('.edit-expense').forEach(button => {
      button.addEventListener('click', openEditExpenseModal);
    });
    tbody.querySelectorAll('.delete-expense').forEach(button => {
      button.addEventListener('click', deleteExpense);
    });
  }

  // Format currency string
  function formatCurrency(amount) {
    return '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Format date for display (YYYY-MM-DD)
  function formatDate(dateString) {
    const d = new Date(dateString);
    return d.toISOString().split('T')[0];
  }

  // Calculate remaining budget and update progress bar
  function updateBudgetDisplay() {
    const totalSpent = expensesList.reduce((sum, e) => sum + e.price, 0);
    const remaining = currentBudget - totalSpent;
    const remainingElem = document.getElementById('remainingBudget');
    const progressBar = document.getElementById('budgetProgressBar');

    remainingElem.textContent = formatCurrency(remaining < 0 ? 0 : remaining);

    const percent = currentBudget > 0 ? Math.min((totalSpent / currentBudget) * 100, 100) : 0;
    progressBar.style.width = `${percent}%`;
    progressBar.setAttribute('aria-valuenow', percent);

    if (remaining < 0) {
      progressBar.classList.remove('bg-success');
      progressBar.classList.add('bg-danger');
    } else {
      progressBar.classList.remove('bg-danger');
      progressBar.classList.add('bg-success');
    }
  }

  // Open edit expense modal and populate form
  async function openEditExpenseModal(event) {
    const expenseId = event.target.getAttribute('data-id');
    if (!expenseId) return;

    const expense = expensesList.find(e => e.id == expenseId);
    if (!expense) return;

    document.getElementById('editExpenseId').value = expense.id;
    document.getElementById('editExpenseName').value = expense.restaurant_name;
    document.getElementById('editExpensePrice').value = expense.price;

    const editModal = new bootstrap.Modal(document.getElementById('editExpenseModal'));
    editModal.show();
  }

  // Update expense after editing
  async function updateExpense(event) {
    event.preventDefault();

    const id = document.getElementById('editExpenseId').value;
    const name = document.getElementById('editExpenseName').value.trim();
    const price = parseFloat(document.getElementById('editExpensePrice').value);

    if (!name || isNaN(price) || price < 0) {
      alert('Please enter valid expense details.');
      return;
    }

    const { error } = await supabase
      .from('expenses')
      .update({ restaurant_name: name, price })
      .eq('id', id);

    if (error) {
      console.error('Failed to update expense:', error.message);
      alert('Error updating expense.');
      return;
    }

    // Hide modal and reload expenses
    const modal = bootstrap.Modal.getInstance(document.getElementById('editExpenseModal'));
    modal.hide();

    await loadExpenses();
    updateBudgetDisplay();
  }

  // Delete expense handler
  async function deleteExpense(event) {
    const expenseId = event.target.getAttribute('data-id');
    if (!expenseId) return;

    if (!confirm('Are you sure you want to delete this expense?')) return;

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (error) {
      console.error('Failed to delete expense:', error.message);
      alert('Error deleting expense.');
      return;
    }

    await loadExpenses();
    updateBudgetDisplay();
  }
</script>
