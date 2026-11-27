// Preserve bookmarked sections from the former combined product and company guide.
const section = location.hash.slice(1);
if (['guard','spacefix','buildclinic','clausecraft','plancliff','crashcheck','learn','deadlock'].includes(section)) {
  location.replace('./product-' + section + '.html');
} else if (['docs','roadmap','contribute','policies'].includes(section)) {
  location.replace('./handbook.html#' + section);
}
