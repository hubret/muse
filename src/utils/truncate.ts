export const truncate = (str: string, len: number = 50): string => {

  if(str.length > len){
    return str.substring(0, len) + '...';
  }

  return str;
}