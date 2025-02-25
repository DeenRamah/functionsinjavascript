document.addEventListener("DOMContentLoaded", function () {
    const paymentFilter = document.getElementById("mode");
    
    if (paymentFilter) {
        // Payment methods from payfees.html
        const paymentMethods = [
            { value: "", text: "Select a payment method" },
            { value: "CreditCard", text: "Credit Card" },
            { value: "DebitCard", text: "Debit Card" },
            { value: "Cash", text: "Cash" },
            { value: "BankTransfer", text: "Bank Transfer" },
            { value: "MobileMoney", text: "Mobile Money" }
        ];
        
        // Populate the dropdown
        paymentFilter.innerHTML = "";
        paymentMethods.forEach(method => {
            const option = document.createElement("option");
            option.value = method.value;
            option.textContent = method.text;
            paymentFilter.appendChild(option);
        });
    }
});
