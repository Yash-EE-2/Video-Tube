class ApiResponse {
  constructor(data, message = "Success", statusCode) {
    this.statusCode = statusCode<400;
    this.data = data;
    this.message = message;
    this.success = true;
  }
}

export { ApiResponse };