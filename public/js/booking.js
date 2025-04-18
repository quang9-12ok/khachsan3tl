// Add or update this function to properly update the booking summary
function updateBookingSummary() {
  // Get form values
  const checkIn = document.getElementById('checkIn').value;
  const checkOut = document.getElementById('checkOut').value;
  const guests = document.getElementById('guests').value;
  const roomPrice = document.getElementById('roomPrice') ? 
    parseFloat(document.getElementById('roomPrice').value) : 0;
  const roomType = document.getElementById('roomType') ? 
    document.getElementById('roomType').value : '';
  
  // Format dates for display
  const checkInDate = checkIn ? new Date(checkIn) : null;
  const checkOutDate = checkOut ? new Date(checkOut) : null;
  
  // Calculate number of nights
  let nights = 0;
  if (checkInDate && checkOutDate) {
    const timeDiff = checkOutDate.getTime() - checkInDate.getTime();
    nights = Math.ceil(timeDiff / (1000 * 3600 * 24));
  }
  
  // Calculate total price
  const totalPrice = nights * roomPrice;
  
  // Update summary elements
  document.getElementById('summaryCheckIn').textContent = checkIn ? 
    checkInDate.toLocaleDateString('vi-VN') : '-';
  document.getElementById('summaryCheckOut').textContent = checkOut ? 
    checkOutDate.toLocaleDateString('vi-VN') : '-';
  document.getElementById('summaryNights').textContent = nights > 0 ? nights : '-';
  document.getElementById('summaryGuests').textContent = guests ? guests + ' người' : '-';
  document.getElementById('summaryRoomPrice').textContent = roomPrice ? 
    roomPrice.toLocaleString('vi-VN') + ' VND / đêm' : '-';
  document.getElementById('summaryTotalNights').textContent = nights > 0 ? nights : '-';
  document.getElementById('summaryTotal').textContent = totalPrice > 0 ? 
    totalPrice.toLocaleString('vi-VN') + ' VND' : '-';
  
  // Store values in hidden fields if they exist
  if (document.getElementById('nightsInput')) {
    document.getElementById('nightsInput').value = nights;
  }
  if (document.getElementById('totalPriceInput')) {
    document.getElementById('totalPriceInput').value = totalPrice;
  }
}

// Add event listeners to form inputs
document.addEventListener('DOMContentLoaded', function() {
  const checkInInput = document.getElementById('checkIn');
  const checkOutInput = document.getElementById('checkOut');
  const guestsInput = document.getElementById('guests');
  
  if (checkInInput) {
    checkInInput.addEventListener('change', updateBookingSummary);
  }
  
  if (checkOutInput) {
    checkOutInput.addEventListener('change', updateBookingSummary);
  }
  
  if (guestsInput) {
    guestsInput.addEventListener('change', updateBookingSummary);
  }
  
  // Initial update
  updateBookingSummary();
});