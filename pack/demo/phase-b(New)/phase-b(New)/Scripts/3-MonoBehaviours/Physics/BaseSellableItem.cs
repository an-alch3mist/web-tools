/// <summary>
/// has a base sell value — sits between BasePhysicsObject and BaseHeldTool
/// </summary>
public class BaseSellableItem : BasePhysicsObject
{
	public float BaseSellValue = 1f;

	/// <summary> base sell value, overridden by OrePiece etc. </summary>
	public virtual float GetSellValue() => BaseSellValue;
}