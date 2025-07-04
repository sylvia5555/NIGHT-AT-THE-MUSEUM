import React, { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./PaymentDetails.css";
import deliveryMethods from "./delivery.json";
import { CartContext } from "../../context/CartContext";

function PaymentDetails({ hiddenFields = [] }) {
  const { cartItems } = useContext(CartContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState("");

  // Extract state from navigation
  const { source, items: stateItems, orderId, paymentData } = location.state || {};
  const itemsToDisplay = source === "ticket" ? stateItems : cartItems;

  // Calculate subtotal based on source
  const subtotal =
    itemsToDisplay &&
    itemsToDisplay.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);

  // Radio Button
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState("");

  const handleChangeofRadio = (event) => {
    setSelectedDeliveryMethod(event.target.value);
  };

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCode, setPhoneCode] = useState("+20");
  const [selectedNationality, setSelectedNationality] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [street, setStreet] = useState("");

  // Authentication logic
  const getAuthToken = () => {
    const storedUser = localStorage.getItem("user-info");
    if (!storedUser) {
      setApiError("Please log in to proceed.");
      navigate("/login");
      return null;
    }
    return JSON.parse(storedUser).token;
  };

  // Nationalities
  const [nationalities, setNationalities] = useState(["Egypt"]);
  useEffect(() => {
    fetch("https://restcountries.com/v3.1/all")
      .then((response) => response.json())  
      .then((data) => {
        const names = data
          .map((country) => country.name?.common)
          .filter(Boolean)
          .sort();
        setNationalities(names);
      })
      .catch((error) => console.error("Error fetching nationalities:", error));
  }, []);
  

  const handleSelectNationality = (nationality) => {
    setSelectedNationality(nationality);
    setSearchTerm("");
  };

  // Cities
  const egyptianCities = [
    "Cairo",
    "Alexandria",
    "Giza",
    "Shubra El Kheima",
    "Port Said",
    "Suez",
    "Luxor",
    "Asyut",
    "Mansoura",
    "Tanta",
    "Fayoum",
    "Zagazig",
    "Ismailia",
    "Aswan",
    "Damanhur",
    "Minya",
    "Beni Suef",
    "Hurghada",
    "Qena",
    "Sohag",
  ];
  const [filteredCities, setFilteredCities] = useState(egyptianCities);
  const [citySearch, setCitySearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const handleSelectCity = (city) => {
    setSelectedCity(city);
    setShowCityDropdown(false);
    setCitySearch("");
  };

  const handleCitySearch = (e) => {
    const value = e.target.value.toLowerCase();
    setCitySearch(value);
    setFilteredCities(
      egyptianCities.filter((city) => city.toLowerCase().includes(value))
    );
    setShowCityDropdown(true);
  };

  // Map delivery method to ID
  const getDeliveryMethodId = (methodName) => {
    const method = deliveryMethods.find((m) => m.ShortName === methodName);
    return method?.Id || 1; // Default to 1 if not found
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    const token = getAuthToken();
    if (!token) return;

    const fullName = `${firstName} ${lastName}`.trim();
    if (
      !fullName ||
      !email ||
      !phoneNumber ||
      !selectedNationality ||
      (source !== "ticket" && (!selectedCity || !street || !selectedDeliveryMethod))
    ) {
      setApiError("Please fill all required fields.");
      return;
    }

    try {
      if (source === "ticket") {
        const addressPayload = {
          FullName: fullName,
          Email: email,
          Phone: `${phoneCode}${phoneNumber}`,
          nationality: selectedNationality,
        };

        const ticketAddressResponse = await fetch(
          `http://night-at-the-museum.runasp.net/api/Ticket/${orderId}/address`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(addressPayload),
          }
        );

        if (!ticketAddressResponse.ok) {
          const errorData = await ticketAddressResponse.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to save ticket address");
        }
      } else {
        const checkoutPayload = {
          basketId: orderId,
          deliveryMethodId: getDeliveryMethodId(selectedDeliveryMethod),
          shipToAddress: {
            FullName: fullName,
            phone: `${phoneCode}${phoneNumber}`,
            street,
            Email: email,
            city: selectedCity,
            country: selectedNationality,
          },
        };

        const orderResponse = await fetch("http://night-at-the-museum.runasp.net/api/orders", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(checkoutPayload),
        });

        if (!orderResponse.ok) {
          const errorData = await orderResponse.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to create order");
        }
      }

      // Navigate to payment with necessary data
      navigate("/payment", {
        state: {
          source,
          paymentData: paymentData || {},
          items: itemsToDisplay,
          orderId,
        },
      });
    } catch (error) {
      console.error("Checkout API Error:", error);
      setApiError(error.message || "Failed to save order details. Please try again.");
    }
  };

  return (
    <div className="divContainer">
      <h2>Billing Details</h2>
      <div className="Payment-container">
        <div className="billing-section">
          <form onSubmit={handleCheckout}>
            <div className="form-group">
              <div className="name-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  required
                />
              </div>
              <div className="name-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <div className="phone-input">
                <select
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value)}
                >
                  {Object.entries({
                    Egypt: "+20",
                    "United States": "+1",
                    "United Kingdom": "+44",
                    France: "+33",
                    Germany: "+49",
                    India: "+91",
                    China: "+86",
                    Canada: "+1",
                    Australia: "+61",
                  }).map(([country, code]) => (
                    <option key={country} value={code}>
                      {country} ({code})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>

            {!hiddenFields.includes("nationality") && (
              <div className="form-group">
                <label>Nationality</label>
                <div className="dropdown-container">
                  <input
                    type="text"
                    placeholder="Search or select nationality"
                    value={searchTerm || selectedNationality}
                    onClick={() => setShowDropdown(!showDropdown)}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <div
                    className={`dropdown-options ${showDropdown ? "show" : ""}`}
                  >
                    {nationalities
                      .filter((nation) =>
                        nation.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((nation, index) => (
                        <div
                          key={index}
                          onClick={() => handleSelectNationality(nation)}
                        >
                          {nation}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {!hiddenFields.includes("city") && source !== "ticket" && (
              <div className="form-group">
                <label>Town / City *</label>
                <div className="dropdown-container">
                  <input
                    type="text"
                    placeholder="Search city..."
                    value={citySearch || selectedCity}
                    onClick={() => setShowCityDropdown(!showCityDropdown)}
                    onChange={handleCitySearch}
                    required
                  />
                  {showCityDropdown && (
                    <div
                      className={`dropdown-options ${showCityDropdown ? "show" : ""}`}
                    >
                      {filteredCities.map((city, index) => (
                        <div key={index} onClick={() => handleSelectCity(city)}>
                          {city}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!hiddenFields.includes("street") && source !== "ticket" && (
              <div className="form-group">
                <label>Street Address *</label>
                <input
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="House number and street name"
                  required
                />
              </div>
            )}

            {!hiddenFields.includes("delivery") && source !== "ticket" && (
              <div className="delivery-form">
                <h3>Select Your Delivery Method</h3>
                <div className="radio-group">
                  {deliveryMethods.map((method) => (
                    <label key={method.ShortName}>
                      <input
                        type="radio"
                        name="deliveryMethod"
                        value={method.ShortName}
                        checked={selectedDeliveryMethod === method.ShortName}
                        onChange={handleChangeofRadio}
                        required
                      />
                      {method.ShortName} (Cost: {method.Cost})
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" className="place-order-btn">
              Proceed to Payment
            </button>
            {apiError && <p className="error-message">{apiError}</p>}
          </form>
        </div>

        <div className="order-summary">
          <h3>Your Order</h3>
          <table>
            <thead>
              <tr>
                <th>Product/Ticket</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {itemsToDisplay &&
                itemsToDisplay.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {source === "ticket"
                        ? `${item.title} (${item.TypeName || "N/A"})`
                        : `${item.title} × ${item.quantity || 1}`}
                    </td>
                    <td>
                      {source === "ticket"
                        ? `EGP ${(item.price || 0).toLocaleString()}`
                        : `$${((item.price || 0) * (item.quantity || 1)).toLocaleString()}`}
                    </td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Subtotal</td>
                <td>
                  {source === "ticket"
                    ? `EGP ${subtotal?.toLocaleString() || "0"}`
                    : `$${subtotal?.toLocaleString() || "0"}`}
                </td>
              </tr>
              {source !== "ticket" && selectedDeliveryMethod && (
                <tr>
                  <td>Delivery ({selectedDeliveryMethod})</td>
                  <td>
                    $
                    {deliveryMethods.find(
                      (m) => m.ShortName === selectedDeliveryMethod
                    )?.Cost || 0}
                  </td>
                </tr>
              )}
              <tr>
                <td>
                  <strong>Total</strong>
                </td>
                <td>
                  <strong>
                    {source === "ticket"
                      ? `EGP ${subtotal?.toLocaleString() || "0"}`
                      : `$${(subtotal || 0) +
                      (deliveryMethods.find(
                        (m) => m.ShortName === selectedDeliveryMethod
                      )?.Cost || 0)
                      }`}
                  </strong>
                </td>
              </tr>
            </tfoot>
          </table>

          <div className="payment-method">
            <h4>Direct Bank Transfer</h4>
            <p>
              Make your payment directly into our bank account. Please use your
              Order ID as the payment reference. Your order will not be shipped
              until the funds have cleared in our account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentDetails;