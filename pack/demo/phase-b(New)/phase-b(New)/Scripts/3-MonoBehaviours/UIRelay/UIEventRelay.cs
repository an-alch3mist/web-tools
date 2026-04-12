using System;

using UnityEngine;
using UnityEngine.EventSystems;

/// <summary>
/// relays Unity EventSystem events to Action callbacks — attach to any UI prefab, zero logic
/// </summary>
public class UIEventRelay : MonoBehaviour,
	IBeginDragHandler, IDragHandler, IEndDragHandler, IDropHandler,
	IPointerEnterHandler, IPointerExitHandler, IPointerDownHandler
{
	#region public API
	public int Index;
	public Action<UIEventRelay, PointerEventData> onBeginDrag;
	public Action<PointerEventData> onDrag;
	public Action<UIEventRelay, PointerEventData> onEndDrag;
	public Action<UIEventRelay, PointerEventData> onDrop;
	public Action<UIEventRelay> onPointerEnter;
	public Action<UIEventRelay> onPointerExit;
	public Action<UIEventRelay> onPointerDown;
	#endregion

	#region relay
	public void OnBeginDrag(PointerEventData e) => onBeginDrag?.Invoke(this, e);
	public void OnDrag(PointerEventData e) => onDrag?.Invoke(e);
	public void OnEndDrag(PointerEventData e) => onEndDrag?.Invoke(this, e);
	public void OnDrop(PointerEventData e) => onDrop?.Invoke(this, e);
	public void OnPointerEnter(PointerEventData e) => onPointerEnter?.Invoke(this);
	public void OnPointerExit(PointerEventData e) => onPointerExit?.Invoke(this);
	public void OnPointerDown(PointerEventData e) => onPointerDown?.Invoke(this);
	#endregion
}