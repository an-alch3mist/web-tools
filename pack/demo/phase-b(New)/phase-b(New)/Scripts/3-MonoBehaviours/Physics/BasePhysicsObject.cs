using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// accumulates conveyor velocities for FixedUpdate — base for all physics world objects
/// </summary>
public class BasePhysicsObject : MonoBehaviour
{
	#region constants
	public const float STANDARD_LINEAR_DAMPING = 0.2f;
	public const float STANDARD_ANGULAR_DAMPING = 0.05f;
	#endregion

	#region private API
	[HideInInspector] public Vector3 SumVelocity;
	[HideInInspector] public float BestY;
	[HideInInspector] public int Count;
	[HideInInspector] public bool RetainY;
	Rigidbody rb;
	#endregion

	#region public API
	public Rigidbody Rb => rb;
	/// <summary> add conveyor velocity contribution </summary>
	public void AddConveyorVelocity(Vector3 velocity, bool retainY)
	{
		if (Count == 0) SumVelocity = velocity;
		else SumVelocity += velocity;
		if (velocity.y > BestY) BestY = velocity.y;
		Count++;
		if (retainY) RetainY = true;
	}
	/// <summary> reset per-frame accumulation </summary>
	public void ResetAccum()
	{
		SumVelocity = default;
		BestY = 0f;
		Count = 0;
		RetainY = false;
	}
	#endregion

	#region Unity Life Cycle
	protected virtual void Awake()
	{
		rb = GetComponent<Rigidbody>();
		if (rb != null)
		{
			rb.linearDamping = STANDARD_LINEAR_DAMPING;
			rb.angularDamping = STANDARD_ANGULAR_DAMPING;
		}
	}
	protected virtual void OnEnable()
	{
		// Phase D: ConveyorBeltManager.Register(this);
	}
	protected virtual void OnDisable()
	{
		// Phase D: ConveyorBeltManager.Unregister(this);
	}
	#endregion
}