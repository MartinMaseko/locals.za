namespace LocalsZaApi.Models;

public class DeliveryAddress
{
    public string Street    { get; set; } = "";
    public string City      { get; set; } = "";
    public string Province  { get; set; } = "";
    public string PostalCode { get; set; } = "";
    public double Lat       { get; set; }
    public double Lng       { get; set; }
}