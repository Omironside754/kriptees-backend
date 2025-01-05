class ApiFeatures {
  // query ==> await Product.find();
  // queryString  ==> req.query
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  // specific product search() =>
  search() {
    //queryString.keyword => https://example.com/path/to/page?name=ferret&color=purple [here => name and color are keyword]
    const keyword = this.queryString.keyword
      ? {
          name: {
            $regex: this.queryString.keyword,
            $options: "i", // for case insenstiveness
          },
        }
      : {};

    this.query = this.query.find({ ...keyword }); // here query ==> await Product.find(); we know that

    return this;
  }

  // filter() the product ==> filetr work base on category
  filter() {
    const queryCopy = { ...this.queryString };
    const removeFields = ["keyword", "page", "limit"];
    removeFields.forEach((key) => delete queryCopy[key]);
  
    // Handle price range filter
    let queryStr = JSON.stringify(queryCopy);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (key) => `$${key}`);
  
    // Handle multiple filters
    const parsedQuery = JSON.parse(queryStr);
  
    // Add specific filters
    if (this.queryString.size) {
      parsedQuery.size = this.queryString.size;
    }
    if (this.queryString.color) {
      parsedQuery.color = this.queryString.color;
    }
    if (this.queryString.tags) {
      parsedQuery.tags = { $in: this.queryString.tags.split(',') };
    }
  
    this.query = this.query.find(parsedQuery);
    return this;
  }

  // Pagintaion =>
  
  Pagination(resulltPrrPage) {
  
    // we are shwoing products resulltPrrPage{eg :5 item} in every page
    const currentPage = Number(this.queryString.page) || 1; // if there is no page value in query then show first page
    const skip = resulltPrrPage * (currentPage - 1); // here lets say we have 50 total product and we are showing 10 product  in one page so if page value is 2 then => 10 * (2-1) =  10, we will skip first 10 product for showing second page
    this.query = this.query.limit(resulltPrrPage).skip(skip); // limit is query of mongoose set limit to retrun product and skip is how manny starting product we want to skip for next page number
    return this;
  }
}
module.exports = ApiFeatures;
