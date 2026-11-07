export async function enterExhibition(page){
  await page.locator('.ribbon-explore').click();
  await page.waitForFunction(()=>{const state=window.stackDebug?.();return state?.renderer==='static'||state?.experience?.progress>.99995;});
  await page.mouse.move(-10,-10);
}
