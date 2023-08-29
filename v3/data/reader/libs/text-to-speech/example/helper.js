function splitText(text, maxLength, minLength) {
  // Split text into an array of sentences
  const segments = text.split(/([.,\s\t]+)/g);
  const result = [];
  let currentSegment = '';

  // Iterate over each segment
  for (let i = 0; i < segments.length; i++) {
    // If adding the current segment to the result would exceed maxLength, add currentSegment to the result
    if (currentSegment.length + segments[i].length > maxLength && currentSegment.length >= minLength) {
      result.push(currentSegment.trim());
      currentSegment = '';
    }

    // Add the current segment to the currentSegment variable
    currentSegment += segments[i];

    // If the currentSegment already exceeds maxLength, split it at the last space or period
    if (currentSegment.length > maxLength && currentSegment.lastIndexOf(' ') !== -1) {
      const lastSpace = currentSegment.lastIndexOf(' ');
      result.push(currentSegment.slice(0, lastSpace).trim());
      currentSegment = currentSegment.slice(lastSpace);
    }
    else if (currentSegment.length > maxLength && currentSegment.lastIndexOf('.') !== -1) {
      const lastPeriod = currentSegment.lastIndexOf('.');
      result.push(currentSegment.slice(0, lastPeriod + 1).trim());
      currentSegment = currentSegment.slice(lastPeriod + 1);
    }
  }

  // Add any remaining segment to the result
  if (currentSegment.length >= 0) {
    result.push(currentSegment.trim());
  }

  return result;
}
