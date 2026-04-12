using System;
using System.Linq;
using System.Collections;
using System.Collections.Generic;

using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;
using TMPro;

using SPACE_UTIL;

/// <summary>
/// grabs physics objects with SpringJoint + LineRenderer rope
/// </summary>
public class PlayerGrab : MonoBehaviour
{
	#region Inspector Fields
	[SerializeField] Camera _cam;
	[SerializeField] Transform _holdPos;
	[SerializeField] GameObject _dragger;
	[SerializeField] LineRenderer _rope;
	[SerializeField] float _interactRange = 2f;
	[SerializeField] LayerMask _interactLayerMask;
	#endregion

	#region private API
	GameObject heldObject;
	SpringJoint grabJoint;
	float grabOriginalDrag;
	float grabOriginalAngularDrag;
	bool isAnyMenuOpen;
	#endregion

	#region public API
	/// <summary> true if currently holding an object </summary>
	public bool IsHolding => heldObject != null;
	#endregion

	#region extra
	// nice-to-have: RigidbodyDraggerController calls this when SpringJoint breaks — auto-releases orphan grab
	public void ForceRelease()
	{
		if (grabJoint != null)
		{
			grabJoint.connectedBody = null;
			Destroy(grabJoint);
			grabJoint = null;
			_dragger.SetActive(false);
			if (heldObject != null)
			{
				Rigidbody rb = heldObject.GetComponent<Rigidbody>();
				rb.linearDamping = grabOriginalDrag;
				rb.angularDamping = grabOriginalAngularDrag;
				UtilsPhaseB.IgnoreAllCollisions(heldObject, gameObject, false);
				StartCoroutine(DisableInterpolationLater(rb));
			}
		}
		heldObject = null;
		_rope.enabled = false;
	}
	#endregion

	#region Unity Life Cycle
	private void Start()
	{
		// purpose: block grab when menu is open
		GameEvents.OnMenuStateChanged += (open) => isAnyMenuOpen = open;
		_rope.enabled = false;
	}
	private void Update()
	{
		if (INPUT.K.InstantDown(KeyCode.Mouse1)) TryGrab();

		if (heldObject != null && !heldObject.activeInHierarchy) Release();

		if (grabJoint != null && heldObject != null)
		{
			_rope.SetPosition(0, _dragger.transform.position);
			Vector3 anchorWorld = grabJoint.connectedBody.transform.TransformPoint(grabJoint.connectedAnchor);
			_rope.SetPosition(1, anchorWorld);
			_rope.enabled = true;
		}
		else _rope.enabled = false;
	}
	void TryGrab()
	{
		if (isAnyMenuOpen) return;
		if (heldObject != null || grabJoint != null) { Release(); return; }
		if (!Physics.Raycast(_cam.transform.position, _cam.transform.forward, out RaycastHit hit, _interactRange, _interactLayerMask)) return;
		if (!hit.collider.CompareTag("Grabbable")) return;
		GrabObject(hit);
	}
	void GrabObject(RaycastHit hit)
	{
		heldObject = hit.collider.gameObject;
		Rigidbody rb = heldObject.GetComponent<Rigidbody>();

		_dragger.SetActive(true);
		_dragger.transform.parent = _holdPos;
		grabJoint = _dragger.AddComponent<SpringJoint>();
		_dragger.GetComponent<Rigidbody>().isKinematic = true;

		rb.isKinematic = false;
		UtilsPhaseB.IgnoreAllCollisions(heldObject, gameObject, true);
		rb.interpolation = RigidbodyInterpolation.Interpolate;
		grabJoint.breakForce = 120f;
		grabJoint.breakTorque = 20f;
		grabJoint.transform.position = hit.point;
		grabJoint.anchor = Vector3.zero;
		grabJoint.spring = 100f;
		grabJoint.damper = 25f;
		grabJoint.maxDistance = 0f;
		grabJoint.connectedBody = rb;
		grabJoint.gameObject.transform.position = _holdPos.position;
		_rope.positionCount = 2;
		_rope.enabled = true;
		grabOriginalDrag = rb.linearDamping;
		grabOriginalAngularDrag = rb.angularDamping;
		rb.linearDamping = 2.5f;
		rb.angularDamping = 0.3f;
	}
	void Release()
	{
		if (isAnyMenuOpen) return;
		if (grabJoint != null)
		{
			grabJoint.connectedBody = null;
			Destroy(grabJoint);
			grabJoint = null;
			_dragger.SetActive(false);
			if (heldObject != null)
			{
				Rigidbody rb = heldObject.GetComponent<Rigidbody>();
				rb.linearDamping = grabOriginalDrag;
				rb.angularDamping = grabOriginalAngularDrag;
				UtilsPhaseB.IgnoreAllCollisions(heldObject, gameObject, false);
				StartCoroutine(DisableInterpolationLater(rb));
			}
		}
		heldObject = null;
		_rope.enabled = false;
	}
	IEnumerator DisableInterpolationLater(Rigidbody body)
	{
		yield return new WaitForSeconds(3f);
		if (body != null && (heldObject == null || heldObject.GetComponent<Rigidbody>() != body))
			body.interpolation = RigidbodyInterpolation.None;
	}
	#endregion
}